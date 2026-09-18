-- ============================================================
-- AI 循环衣橱 · 测试数据 (Step 1)
-- 在 migration.sql 之后执行
-- 约 30 件库存，覆盖常见风格与场景
-- ============================================================

-- 清空旧数据（保持可重复执行）
truncate table order_items, orders, outfit_items, outfits, products, users cascade;

-- ---------- 用户 ----------
insert into public.users (id, nickname, gender, height_cm, weight_kg, body_type, style_preferences, budget_max) values
  ('00000000-0000-0000-0000-000000000001', '测试用户', 'male', 185, 90, 'athletic', array['japanese minimalist','casual'], 300),
  ('00000000-0000-0000-0000-000000000002', '演示游客', 'female', 165, 55, 'slim', array['elegant','minimalist'], 500);

-- ---------- 商品（默认 available） ----------
insert into public.products
  (sku, name, category, brand, size, color, material, style_tags, occasion_tags, rental_price, sale_price, condition, image_url, status) values
-- 上衣 (tops)
('TP-001', '日系纯棉白T', 'top', 'MUJI', 'M', 'white', 'cotton', array['japanese minimalist','casual','basic'], array['date','daily','travel'], 15, 79, 'good', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab', 'available'),
('TP-002', '重磅黑色T恤', 'top', 'Uniqlo', 'L', 'black', 'cotton', array['street','casual','basic'], array['date','daily'], 18, 99, 'good', 'https://images.unsplash.com/photo-1503341504253-dff4815485f1', 'available'),
('TP-003', '米白亚麻衬衫', 'top', 'MUJI', 'L', 'beige', 'linen', array['japanese minimalist','natural'], array['date','travel','work'], 32, 129, 'good', 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10', 'available'),
('TP-004', '藏青西装外套', 'top', 'COS', 'L', 'navy', 'wool blend', array['smart casual','minimalist'], array['work','date'], 39, 189, 'good', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf', 'available'),
('TP-005', '针织开衫', 'top', 'Uniqlo', 'M', 'grey', 'cotton', array['japanese minimalist','cozy'], array['date','daily'], 22, 89, 'good', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8', 'available'),
('TP-006', '日系条纹长袖', 'top', 'MUJI', 'M', 'navy', 'cotton', array['japanese minimalist','casual'], array['daily','travel'], 24, 99, 'good', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27', 'available'),

-- 裤装/下装
('BT-001', '直筒休闲裤', 'bottom', 'Uniqlo', 'L', 'beige', 'cotton', array['japanese minimalist','smart casual'], array['date','work','travel'], 26, 119, 'good', 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8', 'available'),
('BT-002', '黑色修身牛仔裤', 'bottom', 'Levis', 'L', 'black', 'denim', array['casual','street','basic'], array['date','daily'], 25, 139, 'good', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246', 'available'),
('BT-003', '卡其工装裤', 'bottom', 'Carhartt', 'L', 'khaki', 'cotton', array['street','urban','casual'], array['daily','travel'], 28, 129, 'good', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a', 'available'),
('BT-004', '米白阔腿裤', 'bottom', 'COS', 'M', 'ivory', 'linen', array['japanese minimalist','elegant'], array['date','work'], 32, 159, 'good', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1', 'available'),
('BT-005', '深灰西裤', 'bottom', 'COS', 'L', 'dark grey', 'wool', array['smart','minimal'], array['work'], 30, 149, 'good', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a', 'available'),

-- 外套
('OT-001', '米色风衣', 'outerwear', 'COS', 'L', 'beige', 'cotton', array['japanese minimalist','elegant'], array['date','work','travel'], 45, 249, 'good', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3', 'available'),
('OT-002', '黑色皮衣', 'outerwear', 'Zara', 'L', 'black', 'leather', array['street','rock','urban'], array['date','casual'], 40, 229, 'good', 'https://images.unsplash.com/photo-1551028719-00167b16eac5', 'available'),
('OT-003', '藏青大衣', 'outerwear', 'COS', 'L', 'navy', 'wool', array['minimal','smart'], array['work','date'], 42, 279, 'good', 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3', 'available'),
('OT-004', '格纹西装外套', 'outerwear', 'Zara', 'L', 'plaid', 'wool', array['smart','classic'], array['work','date'], 38, 199, 'good', 'https://images.unsplash.com/photo-1507679799987-c73779587ccf', 'available'),

-- 裙装
('DR-001', '黑色连衣裙', 'dress', 'COS', 'M', 'black', 'cotton', array['minimal','elegant'], array['date','party'], 30, 189, 'good', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8', 'available'),
('DR-002', '米色法式连衣裙', 'dress', 'Maje', 'M', 'beige', 'cotton', array['elegant','feminine'], array['date'], 36, 219, 'good', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c', 'available'),

-- 鞋履
('SH-001', '白色休闲板鞋', 'shoes', 'Converse', '42', 'white', 'canvas', array['casual','street'], array['daily','date','travel'], 20, 129, 'good', 'https://images.unsplash.com/photo-1549298916-b41d501d3772', 'available'),
('SH-002', '黑色皮鞋', 'shoes', 'Clarks', '42', 'black', 'leather', array['smart','minimal'], array['work','date'], 30, 199, 'good', 'https://images.unsplash.com/photo-1560343090-f0409e92791a', 'available'),
('SH-003', '棕色德比鞋', 'shoes', 'Clarks', '42', 'brown', 'leather', array['classic','smart'], array['work','date'], 32, 209, 'good', 'https://images.unsplash.com/photo-1533867617858-e7b97e060509', 'available'),

-- 配饰
('AC-001', '简约皮革腰带', 'accessory', 'H&M', 'L', 'black', 'leather', array['minimal','basic'], array['work','date'], 5, 49, 'good', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62', 'available'),
('AC-002', '日系帆布托特包', 'accessory', 'MUJI', 'free', 'khaki', 'canvas', array['japanese minimalist','casual'], array['daily','travel','date'], 12, 89, 'good', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa', 'available'),
('AC-003', '极简皮质手拿包', 'accessory', 'COS', 'free', 'black', 'leather', array['minimal','elegant'], array['date','party'], 15, 119, 'good', 'https://images.unsplash.com/photo-1559563458-527698bf5295', 'available'),
('AC-004', '银色细链项链', 'accessory', 'Swarovski', 'free', 'silver', 'metal', array['elegant','minimal'], array['date','party'], 8, 79, 'good', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338', 'available'),

-- 其他/备用商品（部分非 available 用于测试状态流转）
('BK-001', '白色oversize卫衣', 'top', 'Uniqlo', 'L', 'white', 'cotton', array['casual','street'], array['daily','travel'], 22, 99, 'good', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27', 'rented'),
('BK-002', '藏青针织衫', 'top', 'COS', 'M', 'navy', 'cotton', array['minimal','japanese minimalist'], array['work'], 20, 109, 'good', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1', 'cleaning'),
('BK-003', '牛仔裤 洗护中', 'bottom', 'Levis', 'L', 'blue', 'denim', array['casual','street'], array['daily'], 24, 129, 'fair', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246', 'cleaning'),
('BK-004', '修身西裤', 'bottom', 'Zara', 'L', 'black', 'wool', array['smart'], array['work'], 26, 139, 'good', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a', 'repair'),
('BK-005', '基础白T 补库存', 'top', 'MUJI', 'L', 'white', 'cotton', array['basic','casual'], array['daily'], 18, 49, 'good', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab', 'offline');

-- 验证
select category, count(*) from products group by category order by category;
