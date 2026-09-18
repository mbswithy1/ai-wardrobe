-- ============================================================
-- AI 循环衣橱 · 数据库 Schema (Step 1)
-- 说明：在 Supabase Dashboard → SQL Editor 中整段执行
-- ============================================================

-- ---------- 1. 扩展 ----------
create extension if not exists "uuid-ossp";

-- ---------- 2. 枚举类型 ----------
do $$ begin
  create type product_status as enum ('available','reserved','rented','cleaning','repair','offline');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending','reserved','rented','returned','cancelled');
exception when duplicate_object then null; end $$;

-- ---------- 3. 用户表 ----------
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  nickname      text,
  gender        text check (gender in ('male','female','other')),
  height_cm     int check (height_cm between 100 and 250),
  weight_kg     int check (weight_kg between 30 and 250),
  body_type     text,
  style_preferences text[] default '{}',
  budget_max    int,
  created_at    timestamptz not null default now()
);

-- ---------- 4. 商品表 ----------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  sku           text not null unique,
  name          text not null,
  category      text not null check (category in ('top','bottom','outerwear','dress','shoes','accessory','bag','other')),
  brand         text,
  size          text,
  color         text,
  material      text,
  style_tags    text[] default '{}',
  occasion_tags text[] default '{}',
  rental_price  numeric(10,2) not null check (rental_price >= 0),
  sale_price    numeric(10,2) check (sale_price >= 0),
  condition     text default 'good',
  image_url     text,
  status        product_status not null default 'available',
  created_at    timestamptz not null default now()
);
create index if not exists idx_products_status  on public.products (status);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_style   on public.products using gin (style_tags);

-- ---------- 5. 穿搭表 ----------
create table if not exists public.outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete cascade,
  occasion    text,
  style       text,
  budget      numeric(10,2),
  ai_reason   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.outfit_items (
  outfit_id  uuid references public.outfits(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  category   text,
  primary key (outfit_id, product_id)
);

-- ---------- 6. 订单表 ----------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.users(id) on delete set null,
  outfit_id      uuid references public.outfits(id) on delete set null,
  total_price    numeric(10,2) not null,
  rental_days    int not null default 3,
  status         order_status not null default 'pending',
  shipping_address text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_orders_status on public.orders (status);

create table if not exists public.order_items (
  order_id     uuid references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id),
  rental_price numeric(10,2) not null,
  primary key (order_id, product_id)
);

-- ---------- 7. RLS ----------
alter table public.users        enable row level security;
alter table public.products     enable row level security;
alter table public.outfits      enable row level security;
alter table public.outfit_items enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;

-- 游客只能读 available 的商品；管理员通过 service role 走全量
drop policy if exists "products readable when available" on public.products;
create policy "products readable when available"
  on public.products for select
  using (status = 'available');

-- 用户只能读自己的数据（游客用户由后端创建）
drop policy if exists "users own" on public.users;
create policy "users own" on public.users for select using (id = auth.uid());

drop policy if exists "outfits own" on public.outfits;
create policy "outfits own" on public.outfits for select using (user_id = auth.uid());

drop policy if exists "orders own" on public.orders;
create policy "orders own" on public.orders for select using (user_id = auth.uid());

-- ---------- 8. 防超卖事务 RPC ----------
-- 说明：下单核心。锁定所有商品行 -> 校验库存 -> 插入订单+明细 -> 全部 reserved
-- 任何一步失败整体回滚，杜绝超卖。
create or replace function public.create_order_with_items(
  p_user_id uuid,
  p_product_ids uuid[],
  p_rental_days int default 3,
  p_shipping_address text default null
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total numeric(10,2) := 0;
  v_product record;
  v_row_price int;
begin
  if p_product_ids is null or array_length(p_product_ids, 1) = 0 then
    raise exception 'empty product list';
  end if;

  -- 锁住所有商品行，防止并发下单超卖
  for v_product in
    select id, rental_price, status
    from products
    where id = any(p_product_ids)
    order by id
    for update
  loop
    if v_product.status <> 'available' then
      raise exception 'product % not available (status=%)', v_product.id, v_product.status;
    end if;
    v_total := v_total + v_product.rental_price;
  end loop;

  -- 校验商品数量与传入一致（防传不存在的 id）
  select count(*) into v_row_price from products where id = any(p_product_ids);
  if v_row_price <> array_length(p_product_ids, 1) then
    raise exception 'some products not found';
  end if;

  -- 创建订单
  insert into orders (user_id, total_price, rental_days, status, shipping_address)
  values (p_user_id, v_total, p_rental_days, 'pending', p_shipping_address)
  returning id into v_order_id;

  -- 写明细 + 改库存状态
  insert into order_items (order_id, product_id, rental_price)
  select v_order_id, id, rental_price from products where id = any(p_product_ids);

  update products set status = 'reserved' where id = any(p_product_ids);

  return json_build_object('order_id', v_order_id, 'total_price', v_total);
end;
$$;

-- ---------- 9. 订单状态流转时自动同步商品状态 ----------
create or replace function sync_product_status_on_order_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' then
    update products set status = 'available'
    where id in (select product_id from order_items where order_id = new.id);
  elsif new.status = 'rented' then
    update products set status = 'rented'
    where id in (select product_id from order_items where order_id = new.id);
  elsif new.status = 'returned' then
    update products set status = 'cleaning'
    where id in (select product_id from order_items where order_id = new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_status on public.orders;
create trigger trg_order_status
  after update of status on public.orders
  for each row
  execute function public.sync_product_status_on_order_change();