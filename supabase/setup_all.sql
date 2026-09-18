-- ============================================================
-- AI 寰幆琛ｆ┍ 路 鏁版嵁搴?Schema (Step 1)
-- 璇存槑锛氬湪 Supabase Dashboard 鈫?SQL Editor 涓暣娈垫墽琛?-- ============================================================

-- ---------- 1. 鎵╁睍 ----------
create extension if not exists "uuid-ossp";

-- ---------- 2. 鏋氫妇绫诲瀷 ----------
do $$ begin
  create type product_status as enum ('available','reserved','rented','cleaning','repair','offline');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending','reserved','rented','returned','cancelled');
exception when duplicate_object then null; end $$;

-- ---------- 3. 鐢ㄦ埛琛?----------
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

-- ---------- 4. 鍟嗗搧琛?----------
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

-- ---------- 5. 绌挎惌琛?----------
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

-- ---------- 6. 璁㈠崟琛?----------
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

-- 娓稿鍙兘璇?available 鐨勫晢鍝侊紱绠＄悊鍛橀€氳繃 service role 璧板叏閲?drop policy if exists "products readable when available" on public.products;
create policy "products readable when available"
  on public.products for select
  using (status = 'available');

-- 鐢ㄦ埛鍙兘璇昏嚜宸辩殑鏁版嵁锛堟父瀹㈢敤鎴风敱鍚庣鍒涘缓锛?drop policy if exists "users own" on public.users;
create policy "users own" on public.users for select using (id = auth.uid());

drop policy if exists "outfits own" on public.outfits;
create policy "outfits own" on public.outfits for select using (user_id = auth.uid());

drop policy if exists "orders own" on public.orders;
create policy "orders own" on public.orders for select using (user_id = auth.uid());

-- ---------- 8. 闃茶秴鍗栦簨鍔?RPC ----------
-- 璇存槑锛氫笅鍗曟牳蹇冦€傞攣瀹氭墍鏈夊晢鍝佽 -> 鏍￠獙搴撳瓨 -> 鎻掑叆璁㈠崟+鏄庣粏 -> 鍏ㄩ儴 reserved
-- 浠讳綍涓€姝ュけ璐ユ暣浣撳洖婊氾紝鏉滅粷瓒呭崠銆?create or replace function public.create_order_with_items(
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
  v_rowcount int;
begin
  if p_product_ids is null or array_length(p_product_ids, 1) = 0 then
    raise exception 'empty product list';
  end if;

  -- 閿佷綇鎵€鏈夊晢鍝佽锛岄槻姝㈠苟鍙戜笅鍗曡秴鍗?  for v_product in
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

  -- 鏍￠獙鍟嗗搧鏁伴噺涓庝紶鍏ヤ竴鑷达紙闃蹭紶涓嶅瓨鍦ㄧ殑 id锛?  select count(*) into v_row_price from products where id = any(p_product_ids);
  if v_row_price <> array_length(p_product_ids, 1) then
    raise exception 'some products not found';
  end if;

  -- 鍒涘缓璁㈠崟
  insert into orders (user_id, total_price, rental_days, status, shipping_address)
  values (p_user_id, v_total, p_rental_days, 'pending', p_shipping_address)
  returning id into v_order_id;

  -- 鍐欐槑缁?+ 鏀瑰簱瀛樼姸鎬?  insert into order_items (order_id, product_id, rental_price)
  select v_order_id, id, rental_price from products where id = any(p_product_ids);

  update products set status = 'reserved' where id = any(p_product_ids);

  return json_build_object('order_id', v_order_id, 'total_price', v_total);
end;
$$;

-- ---------- 9. 璁㈠崟鐘舵€佹祦杞椂鑷姩鍚屾鍟嗗搧鐘舵€?----------
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

-- ============================================================
-- SEED DATA (merge)
-- ============================================================
-- ============================================================
-- AI 寰幆琛ｆ┍ 路 娴嬭瘯鏁版嵁 (Step 1)
-- 鍦?migration.sql 涔嬪悗鎵ц
-- 绾?30 浠跺簱瀛橈紝瑕嗙洊甯歌椋庢牸涓庡満鏅?-- ============================================================

-- 娓呯┖鏃ф暟鎹紙淇濇寔鍙噸澶嶆墽琛岋級
truncate table order_items, orders, outfit_items, outfits, products, users cascade;

-- ---------- 鐢ㄦ埛 ----------
insert into public.users (id, nickname, gender, height_cm, weight_kg, body_type, style_preferences, budget_max) values
  ('00000000-0000-0000-0000-000000000001', '娴嬭瘯鐢ㄦ埛', 'male', 185, 90, 'athletic', array['japanese minimalist','casual'], 300),
  ('00000000-0000-0000-0000-000000000002', '婕旂ず娓稿', 'female', 165, 55, 'slim', array['elegant','minimalist'], 500);

-- ---------- 鍟嗗搧锛堥粯璁?available锛?----------
insert into public.products
  (sku, name, category, brand, size, color, material, style_tags, occasion_tags, rental_price, sale_price, condition, image_url, status) values
-- 涓婅。 (tops)
('TP-001', '鏃ョ郴绾鐧絋', 'top', 'MUJI', 'M', 'white', 'cotton', array['japanese minimalist','casual','basic'], array['date','daily','travel'], 15, 79, 'good', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab', 'available'),
('TP-002', '閲嶇榛戣壊T鎭?, 'top', 'Uniqlo', 'L', 'black', 'cotton', array['street','casual','basic'], array['date','daily'], 18, 99, 'good', 'https://images.unsplash.com/photo-1503341504253-dff4815485f1', 'available'),
('TP-003', '绫崇櫧浜氶夯琛～', 'top', 'MUJI', 'L', 'beige', 'linen', array['japanese minimalist','natural'], array['date','travel','work'], 32, 129, 'good', 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10', 'available'),
('TP-004', '钘忛潚瑗胯澶栧', 'top', 'COS', 'L', 'navy', 'wool blend', array['smart casual','minimalist'], array['work','date'], 39, 189, 'good', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf', 'available'),
('TP-005', '閽堢粐寮€琛?, 'top', 'Uniqlo', 'M', 'grey', 'cotton', array['japanese minimalist','cozy'], array['date','daily'], 22, 89, 'good', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8', 'available'),
('TP-006', '鏃ョ郴鏉＄汗闀胯', 'top', 'MUJI', 'M', 'navy', 'cotton', array['japanese minimalist','casual'], array['daily','travel'], 24, 99, 'good', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27', 'available'),

-- 瑁よ/涓嬭
('BT-001', '鐩寸瓛浼戦棽瑁?, 'bottom', 'Uniqlo', 'L', 'beige', 'cotton', array['japanese minimalist','smart casual'], array['date','work','travel'], 26, 119, 'good', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8', 'available'),
('BT-002', '榛戣壊淇韩鐗涗粩瑁?, 'bottom', 'Levis', 'L', 'black', 'denim', array['casual','street','basic'], array['date','daily'], 25, 139, 'good', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246', 'available'),
('BT-003', '鍗″叾宸ヨ瑁?, 'bottom', 'Carhartt', 'L', 'khaki', 'cotton', array['street','urban','casual'], array['daily','travel'], 28, 129, 'good', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a', 'available'),
('BT-004', '绫崇櫧闃旇吙瑁?, 'bottom', 'COS', 'M', 'ivory', 'linen', array['japanese minimalist','elegant'], array['date','work'], 32, 159, 'good', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1', 'available'),
('BT-005', '娣辩伆瑗胯￥', 'bottom', 'COS', 'L', 'dark grey', 'wool', array['smart','minimal'], array['work'], 30, 149, 'good', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a', 'available'),

-- 澶栧
('OT-001', '绫宠壊椋庤。', 'outerwear', 'COS', 'L', 'beige', 'cotton', array['japanese minimalist','elegant'], array['date','work','travel'], 45, 249, 'good', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3', 'available'),
('OT-002', '榛戣壊鐨。', 'outerwear', 'Zara', 'L', 'black', 'leather', array['street','rock','urban'], array['date','casual'], 40, 229, 'good', 'https://images.unsplash.com/photo-1551028719-00167b16eac5', 'available'),
('OT-003', '钘忛潚澶ц。', 'outerwear', 'COS', 'L', 'navy', 'wool', array['minimal','smart'], array['work','date'], 42, 279, 'good', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3', 'available'),
('OT-004', '鏍肩汗瑗胯澶栧', 'outerwear', 'Zara', 'L', 'plaid', 'wool', array['smart','classic'], array['work','date'], 38, 199, 'good', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf', 'available'),

-- 瑁欒
('DR-001', '榛戣壊杩炶。瑁?, 'dress', 'COS', 'M', 'black', 'cotton', array['minimal','elegant'], array['date','party'], 30, 189, 'good', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8', 'available'),
('DR-002', '绫宠壊娉曞紡杩炶。瑁?, 'dress', 'Maje', 'M', 'beige', 'cotton', array['elegant','feminine'], array['date'], 36, 219, 'good', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c', 'available'),

-- 闉嬪饱
('SH-001', '鐧借壊浼戦棽鏉块瀷', 'shoes', 'Converse', '42', 'white', 'canvas', array['casual','street'], array['daily','date','travel'], 20, 129, 'good', 'https://images.unsplash.com/photo-1549298916-b41d501d3772', 'available'),
('SH-002', '榛戣壊鐨瀷', 'shoes', 'Clarks', '42', 'black', 'leather', array['smart','minimal'], array['work','date'], 30, 199, 'good', 'https://images.unsplash.com/photo-1560343090-f0409e92791a', 'available'),
('SH-003', '妫曡壊寰锋瘮闉?, 'shoes', 'Clarks', '42', 'brown', 'leather', array['classic','smart'], array['work','date'], 32, 209, 'good', 'https://images.unsplash.com/photo-1533867617858-e7b97e060509', 'available'),

-- 閰嶉グ
('AC-001', '绠€绾︾毊闈╄叞甯?, 'accessory', 'H&M', 'L', 'black', 'leather', array['minimal','basic'], array['work','date'], 5, 49, 'good', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62', 'available'),
('AC-002', '鏃ョ郴甯嗗竷鎵樼壒鍖?, 'accessory', 'MUJI', 'free', 'khaki', 'canvas', array['japanese minimalist','casual'], array['daily','travel','date'], 12, 89, 'good', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa', 'available'),
('AC-003', '鏋佺畝鐨川鎵嬫嬁鍖?, 'accessory', 'COS', 'free', 'black', 'leather', array['minimal','elegant'], array['date','party'], 15, 119, 'good', 'https://images.unsplash.com/photo-1559563458-527698bf5295', 'available'),
('AC-004', '閾惰壊缁嗛摼椤归摼', 'accessory', 'Swarovski', 'free', 'silver', 'metal', array['elegant','minimal'], array['date','party'], 8, 79, 'good', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338', 'available'),

-- 鍏朵粬/澶囩敤鍟嗗搧锛堥儴鍒嗛潪 available 鐢ㄤ簬娴嬭瘯鐘舵€佹祦杞級
('BK-001', '鐧借壊oversize鍗。', 'top', 'Uniqlo', 'L', 'white', 'cotton', array['casual','street'], array['daily','travel'], 22, 99, 'good', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27', 'rented'),
('BK-002', '钘忛潚閽堢粐琛?, 'top', 'COS', 'M', 'navy', 'cotton', array['minimal','japanese minimalist'], array['work'], 20, 109, 'good', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1', 'cleaning'),
('BK-003', '鐗涗粩瑁?娲楁姢涓?, 'bottom', 'Levis', 'L', 'blue', 'denim', array['casual','street'], array['daily'], 24, 129, 'fair', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246', 'cleaning'),
('BK-004', '淇韩瑗胯￥', 'bottom', 'Zara', 'L', 'black', 'wool', array['smart'], array['work'], 26, 139, 'good', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a', 'repair'),
('BK-005', '鍩虹鐧絋 琛ュ簱瀛?, 'top', 'MUJI', 'L', 'white', 'cotton', array['basic','casual'], array['daily'], 18, 49, 'good', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab', 'offline');

-- 楠岃瘉
select category, count(*) from products group by category order by category;
