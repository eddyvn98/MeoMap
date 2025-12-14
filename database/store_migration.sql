-- ================================================================
-- BẢNG PRODUCTS: Danh sách hàng bán trong hệ thống
-- ================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- Giá (VND)
  category TEXT, -- 'service', 'item', 'addon', etc
  image_url TEXT,
  stock INTEGER DEFAULT -1, -- -1 = vô hạn, >= 0 = có giới hạn
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'discontinued'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products(status);

-- ================================================================
-- BẢNG PURCHASES: Lịch sử mua hàng
-- ================================================================

CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase INTEGER NOT NULL, -- Giá lúc mua (có thể khác hiện tại)
  total_amount INTEGER NOT NULL, -- quantity * price_at_purchase
  
  -- Payment info
  payment_method TEXT, -- 'wallet_balance', 'voucher', 'mixed'
  wallet_used INTEGER DEFAULT 0, -- Tiền từ ví dùng
  voucher_id UUID, -- Voucher sử dụng (nếu có)
  voucher_amount INTEGER DEFAULT 0, -- Giá trị voucher
  
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'cancelled', 'refunded'
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  notes TEXT,
  
  CONSTRAINT purchases_pkey PRIMARY KEY (id),
  CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT purchases_product_id_fkey FOREIGN KEY (product_id) 
    REFERENCES public.products(id) ON DELETE RESTRICT,
  CONSTRAINT purchases_voucher_id_fkey FOREIGN KEY (voucher_id) 
    REFERENCES public.vouchers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_product_id_idx ON public.purchases(product_id);
CREATE INDEX IF NOT EXISTS purchases_status_idx ON public.purchases(status);
CREATE INDEX IF NOT EXISTS purchases_user_status_idx ON public.purchases(user_id, status);

-- ================================================================
-- BẢNG PURCHASE_ITEMS: Chi tiết mua hàng (nếu order có nhiều sản phẩm)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  price_at_purchase INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  CONSTRAINT purchase_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_items_purchase_id_fkey FOREIGN KEY (purchase_id) 
    REFERENCES public.purchases(id) ON DELETE CASCADE,
  CONSTRAINT purchase_items_product_id_fkey FOREIGN KEY (product_id) 
    REFERENCES public.products(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS purchase_items_purchase_id_idx ON public.purchase_items(purchase_id);

-- ================================================================
-- RLS POLICIES
-- ================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- Xóa policies cũ nếu đã tồn tại
DROP POLICY IF EXISTS "Products: Public Read" ON public.products;
DROP POLICY IF EXISTS "Purchases: Users See Own" ON public.purchases;
DROP POLICY IF EXISTS "Purchases: Users Can Insert" ON public.purchases;
DROP POLICY IF EXISTS "Purchase_items: Users See Own" ON public.purchase_items;

-- Products: Public read (ai cũng xem được)
CREATE POLICY "Products: Public Read"
  ON public.products
  FOR SELECT
  USING (true);

-- Purchases: Users can see their own
CREATE POLICY "Purchases: Users See Own"
  ON public.purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Purchases: Users can create (insert)
CREATE POLICY "Purchases: Users Can Insert"
  ON public.purchases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Purchase_items: Users can see items of their purchases
CREATE POLICY "Purchase_items: Users See Own"
  ON public.purchase_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.purchases
      WHERE id = purchase_items.purchase_id
      AND user_id = auth.uid()
    )
  );

-- ================================================================
-- SAMPLE DATA (Optional - uncomment to use)
-- ================================================================

/*
INSERT INTO public.products (name, description, price, category, status) VALUES
('Upgrade Tìm Kiếm (30 ngày)', 'Nâng cao ưu tiên khi tìm kiếm mèo mất', 50000, 'service', 'active'),
('Badge Xác Thực', 'Hiển thị badge xác thực trên profile', 100000, 'addon', 'active'),
('Gia Hạn Bài Đăng (30 ngày)', 'Gia hạn thời gian tìm kiếm cho bài đăng', 30000, 'service', 'active'),
('Báo Cáo Hàng Tuần', 'Nhận báo cáo chi tiết tìm kiếm hàng tuần', 20000, 'service', 'active'),
('Khôi Phục Bài Đăng', 'Khôi phục bài đăng đã bị xóa', 15000, 'addon', 'active');
*/
