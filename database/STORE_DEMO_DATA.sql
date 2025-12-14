-- ============================================================
-- STORE DEMO DATA - Dữ liệu sản phẩm demo cho cửa hàng
-- ============================================================
-- Tạo bởi: GitHub Copilot
-- Ngày: 2025-12-14
-- Mục đích: Tạo dữ liệu demo cho cửa hàng MeoMap
-- ============================================================

-- Xóa dữ liệu cũ (nếu có)
DELETE FROM public.products;

-- ============================================================
-- NHÓM 1: ĂN UỐNG (5 sản phẩm)
-- ============================================================

-- 1. Hạt mèo khô 1.5kg
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Hạt mèo khô 1.5kg (Cho mèo)', 'Thức ăn khô dinh dưỡng cho mèo trưởng thành, công thức cân bằng protein và vitamin. Giúp mèo khỏe mạnh, lông bóng mượt.', 
150000, 'food', 'active', 50, 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400');

-- 2. Pate mèo 85g
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Pate mèo 85g (Cho mèo)', 'Pate mèo vị cá ngừ, kết cấu mềm mịn, dễ tiêu hóa. Thích hợp cho mèo con và mèo trưởng thành.', 
15000, 'food', 'active', 100, 'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=400');

-- 3. Hạt chó khô 3kg
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Hạt chó khô 3kg (Cho chó)', 'Thức ăn khô chất lượng cao cho chó trưởng thành mọi giống. Bổ sung canxi, vitamin và khoáng chất.', 
280000, 'food', 'active', 30, 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400');

-- 4. Snack thưởng cho mèo
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Snack thưởng (Cho mèo)', 'Bánh thưởng giòn tan, vị cá hồi, giúp làm sạch răng và giảm mùi hôi miệng cho mèo.', 
35000, 'food', 'active', 80, 'https://images.unsplash.com/photo-1516750484197-6e4a32a5e4d3?w=400');

-- 5. Snack thưởng cho chó
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Snack thưởng (Cho chó)', 'Xương gặm sạch răng cho chó, vị thịt bò. Giúp chó vui chơi và bảo vệ răng miệng.', 
45000, 'food', 'active', 60, 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400');

-- ============================================================
-- NHÓM 2: VỆ SINH (4 sản phẩm)
-- ============================================================

-- 6. Cát mèo bentonite 10kg
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Cát mèo bentonite 10kg', 'Cát mèo vón cục cao cấp, khử mùi hiệu quả, ít bụi. Dễ dàng vệ sinh và thân thiện với môi trường.', 
120000, 'hygiene', 'active', 40, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400');

-- 7. Cát mèo tofu 6L
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Cát mèo tofu 6L', 'Cát mèo đậu nành sinh học, phân hủy hoàn toàn, an toàn cho thú cưng. Khử mùi tự nhiên, không gây dị ứng.', 
85000, 'hygiene', 'active', 45, 'https://images.unsplash.com/photo-1573865526739-10c1dd7aa3e5?w=400');

-- 8. Túi rác khay cát
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Túi rác khay cát (Cho mèo)', 'Túi rác chuyên dụng cho khay vệ sinh mèo, chống thấm nước, kháng khuẩn. 1 cuộn 30 túi.', 
25000, 'hygiene', 'active', 100, 'https://images.unsplash.com/photo-1611003228941-98852ba62227?w=400');

-- 9. Cây gắp vệ sinh
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Cây gắp vệ sinh (Cho mèo)', 'Cây gắp phân và cát cho mèo, chất liệu nhựa ABS bền bỉ, dễ vệ sinh. Thiết kế ergonomic tiện lợi.', 
18000, 'hygiene', 'active', 70, 'https://images.unsplash.com/photo-1478098711619-5ab0b478d6e6?w=400');

-- ============================================================
-- NHÓM 3: ĐỒ DÙNG THIẾT YẾU (3 sản phẩm)
-- ============================================================

-- 10. Khay vệ sinh mèo
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Khay vệ sinh mèo', 'Khay vệ sinh có nắp đậy, chống mùi hiệu quả. Cửa vào-ra tiện lợi, dễ lắp ráp và vệ sinh. Size: 50x40x35cm.', 
280000, 'essential', 'active', 25, 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400');

-- 11. Vòng cổ cho mèo
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Vòng cổ mèo có chuông', 'Vòng cổ nylon mềm mại, có cơ chế bật khóa an toàn. Kèm chuông và tag tên thú cưng. Nhiều màu sắc.', 
35000, 'essential', 'active', 90, 'https://images.unsplash.com/photo-1516750484197-6e4a32a5e4d3?w=400');

-- 12. Vòng cổ cho chó
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Vòng cổ chó bản lớn', 'Vòng cổ da bền chắc cho chó lớn, có khóa kim loại và vòng treo dây dắt. Size M-L (30-50cm).', 
65000, 'essential', 'active', 50, 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400');

-- ============================================================
-- NHÓM 4: COMBO (1 sản phẩm)
-- ============================================================

-- 13. Combo mèo mới nhận
INSERT INTO public.products (name, description, price, category, status, stock, image_url) VALUES
('Combo mèo mới nhận', 
'🎁 Combo hoàn hảo cho mèo mới về nhà! Bao gồm: Khay vệ sinh + Cát bentonite 5kg + Bát ăn đôi inox + Pate mèo 85g x4 hộp. Tiết kiệm 20% so với mua riêng lẻ!', 
450000, 'combo', 'active', 15, 'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=400');

-- ============================================================
-- VERIFY DATA
-- ============================================================

-- Kiểm tra số lượng sản phẩm đã insert
SELECT 
  category,
  COUNT(*) as total_products,
  SUM(stock) as total_stock,
  SUM(price) as total_value
FROM public.products
WHERE status = 'active'
GROUP BY category
ORDER BY category;

-- Hiển thị tất cả sản phẩm
SELECT 
  id,
  name,
  price,
  category,
  stock,
  status
FROM public.products
ORDER BY category, name;
