# 🛍️ STORE/SHOPPING SYSTEM GUIDE

## 📋 Tổng Quan

Hệ thống cửa hàng cho phép user:
1. ✅ **Xem danh sách sản phẩm** (Services, Add-ons, Items)
2. ✅ **Mua hàng bằng ví** (Balance_COC hoặc Balance_THUONG)
3. ✅ **Dùng voucher để giảm giá**
4. ✅ **Xem lịch sử mua hàng**

---

## 🗂️ Files Tạo/Sửa

### Database (SQL)

#### File mới: `database/store_migration.sql`
```sql
-- Bảng products: Danh sách sản phẩm
-- Bảng purchases: Lịch sử mua hàng
-- Bảng purchase_items: Chi tiết mua hàng
-- RLS policies
```

#### File mới: `database/store_functions.sql`
```sql
-- purchase_product() - Mua sản phẩm
-- get_products() - Lấy danh sách sản phẩm
-- get_purchases() - Lấy lịch sử mua hàng
```

### Services (JavaScript)

#### File sửa: `src/services/walletService.js`
Thêm 3 functions:
```javascript
export async function purchaseProduct(userId, productId, quantity, userVoucherId, notes)
export async function getProducts(category)
export async function getPurchaseHistory(userId, limit, offset)
```

### Frontend (React)

#### File mới: `src/pages/StorePage.jsx`
- Trang chính của cửa hàng
- Hiển thị danh sách sản phẩm
- Filter by category
- Wallet info

#### File mới: `src/components/ProductCard.jsx`
- Thẻ sản phẩm
- Giá, mô tả, tình trạng kho
- Nút "Mua Ngay"

#### File mới: `src/components/CheckoutModal.jsx`
- Modal thanh toán
- Chọn số lượng
- Chọn voucher (tùy chọn)
- Preview giá (với/không voucher)
- Xác nhận mua

#### File mới: `src/components/PurchaseHistory.jsx`
- Lịch sử mua hàng
- Hiển thị chi tiết từng giao dịch
- Payment method (coc, thuong, mixed, voucher)

---

## 🚀 Triển Khai

### Bước 1: Chạy SQL Migrations

```bash
# 1. Tạo bảng products, purchases
→ database/store_migration.sql

# 2. Tạo functions
→ database/store_functions.sql
```

### Bước 2: Thêm Sample Products

```sql
INSERT INTO public.products (name, description, price, category, status) VALUES
  ('Nâng Cao Tìm Kiếm (30 ngày)', 'Ưu tiên cao hơn khi tìm kiếm', 50000, 'service', 'active'),
  ('Badge Xác Thực', 'Hiển thị xác thực trên profile', 100000, 'addon', 'active'),
  ('Gia Hạn Bài Đăng (30 ngày)', 'Tiếp tục tìm kiếm thêm 30 ngày', 30000, 'service', 'active'),
  ('Báo Cáo Hàng Tuần', 'Nhận báo cáo chi tiết hàng tuần', 20000, 'service', 'active');
```

### Bước 3: Deploy React Code

- `src/pages/StorePage.jsx`
- `src/components/ProductCard.jsx`
- `src/components/CheckoutModal.jsx`
- `src/components/PurchaseHistory.jsx`
- Update `src/services/walletService.js`

### Bước 4: Update Navigation

Thêm link "🛍️ Cửa Hàng" vào menu:

```jsx
<NavLink to="/store" className="...">🛍️ Cửa Hàng</NavLink>
```

---

## 💰 Purchase Flow

### User Flow

```
1. Vào trang cửa hàng (/store)
   ↓
2. Xem danh sách sản phẩm (filter by category tùy chọn)
   ↓
3. Click "🛒 Mua Ngay" trên sản phẩm
   ↓
4. Modal checkout:
   - Chọn số lượng
   - (Tùy chọn) Chọn voucher để giảm giá
   - Preview giá trước & sau voucher
   ↓
5. Click "💳 Thanh Toán"
   ↓
6. Backend xử lý:
   a) Kiểm tra stock (nếu có giới hạn)
   b) Kiểm tra balance (coc + thuong)
   c) Trừ ví (balance_coc ưu tiên, nếu không đủ dùng balance_thuong)
   d) Nếu dùng voucher: mark voucher as "used"
   e) Tạo purchase record
   f) Log transactions
   ↓
7. ✅ Success message + reload
```

---

## 🏗️ Database Schema

### Table: `products`

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT,              -- Tên sản phẩm
  description TEXT,       -- Mô tả
  price INTEGER,         -- Giá (VND)
  category TEXT,         -- 'service', 'item', 'addon'
  image_url TEXT,        -- Link ảnh (optional)
  stock INTEGER,         -- -1 = vô hạn, >= 0 = có giới hạn
  status TEXT,           -- 'active', 'inactive', 'discontinued'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Table: `purchases`

```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY,
  user_id UUID,              -- Người mua
  product_id UUID,           -- Sản phẩm mua
  quantity INTEGER,          -- Số lượng
  price_at_purchase INTEGER, -- Giá lúc mua
  total_amount INTEGER,      -- quantity * price
  
  -- Payment info
  payment_method TEXT,       -- 'wallet_balance', 'voucher', 'mixed'
  wallet_used INTEGER,       -- Tiền từ ví dùng
  voucher_id UUID,          -- Voucher dùng (tùy chọn)
  voucher_amount INTEGER,   -- Giá trị voucher
  
  status TEXT,              -- 'completed', 'cancelled', 'refunded'
  purchased_at TIMESTAMP,
  notes TEXT
);
```

---

## 📊 Payment Breakdown

### Example 1: Mua hàng không dùng voucher

```
Product: "Badge Xác Thực"
Price: 100.000 đ
Quantity: 1

Wallet:
  Balance_COC: 80.000 đ
  Balance_THUONG: 50.000 đ

Payment:
1. Check balance: 80 + 50 = 130 >= 100 ✅
2. Dùng balance_coc: 100.000 (đủ)
3. Result:
   - Balance_COC: 80.000 - 100.000 = -20.000 ❌
   - Không đủ balance_coc!
4. Dùng coc + thuong:
   - Balance_COC: 0 (hết)
   - Balance_THUONG: 50.000 - 20.000 = 30.000 ✅
   - Final: COC=0, THUONG=30k
```

### Example 2: Mua hàng dùng voucher

```
Product: "Gia Hạn Bài Đăng (30 ngày)"
Price: 30.000 đ
Quantity: 1
Voucher: VOUCHER_20K (20.000 đ)

Wallet:
  Balance_COC: 100.000 đ
  Balance_THUONG: 0 đ

Payment:
1. Total: 30.000 đ
2. Voucher value: 20.000 đ
3. After voucher: 30.000 - 20.000 = 10.000 đ
4. Use balance_coc: 10.000 (đủ)
5. Result:
   - Balance_COC: 100.000 - 10.000 = 90.000 ✅
   - Voucher: mark as "used" ✅
```

---

## 🎯 Features

### Product Management

- ✅ Danh sách sản phẩm có status (active, inactive, discontinued)
- ✅ Stock management (-1 = unlimited, >= 0 = limited)
- ✅ Category filter
- ✅ Image support (optional)

### Purchase Features

- ✅ Quantity selector
- ✅ Automatic balance selection (balance_coc → balance_thuong)
- ✅ Voucher application (1 voucher per purchase)
- ✅ Stock deduction after purchase
- ✅ Price tracking (price_at_purchase for reference)

### User Experience

- ✅ Real-time balance display
- ✅ Voucher discount preview
- ✅ Payment method visibility
- ✅ Purchase history tracking

---

## ✅ Checklist Triển Khai

- [ ] Chạy `database/store_migration.sql` trong Supabase
- [ ] Chạy `database/store_functions.sql` trong Supabase
- [ ] Thêm sample products
- [ ] Deploy React components
- [ ] Cập nhật navigation menu
- [ ] Test flow: add product → checkout → payment
- [ ] Test voucher application
- [ ] Test insufficient balance error
- [ ] Test purchase history
- [ ] Test stock deduction

---

## 🔒 Security

### RLS Policies

```sql
-- Products: Public read
-- Purchases: Users can see their own
-- Purchase_items: Users can see items of their purchases
```

### Input Validation

```javascript
// Frontend:
- Quantity >= 1
- Product exists and active
- Voucher is active and belongs to user
- Balance sufficient

// Backend (SQL):
- Stock check (if limited)
- Balance sufficient (with lock)
- Product exists and active
- User exists
```

### Payment Security

```sql
-- Atomic transaction: All or nothing
-- Lock user profile during payment
-- Validate voucher status before marking used
-- Log all transactions
```

---

## 📊 Monitoring

### Query Purchase History

```sql
-- Lấy tất cả giao dịch của user
SELECT * FROM purchases
WHERE user_id = 'xxx'
ORDER BY purchased_at DESC;

-- Thống kê theo phương thức thanh toán
SELECT payment_method, COUNT(*), SUM(total_amount)
FROM purchases
WHERE user_id = 'xxx'
GROUP BY payment_method;

-- Vouchers đã dùng
SELECT p.*, v.code, v.amount
FROM purchases p
LEFT JOIN vouchers v ON p.voucher_id = v.id
WHERE p.user_id = 'xxx' AND p.voucher_amount > 0;
```

---

## 🐛 Troubleshooting

### "Không đủ tiền"
- Check balance_coc + balance_thuong
- Verify voucher value correctly deducted
- Check if using voucher or not

### "Voucher không hợp lệ"
- Verify voucher status = 'active'
- Check voucher belongs to user
- Verify voucher code exists

### Stock deduction failed
- Check product stock limit (-1 = unlimited)
- Verify quantity <= available stock

### Purchase doesn't appear in history
- Wait 1-2 seconds for DB sync
- Check purchase status = 'completed'
- Verify user_id matches

---

## 📚 Related Docs

- [VOUCHER_CONVERSION_IMPLEMENTATION.md](VOUCHER_CONVERSION_IMPLEMENTATION.md) - Quy đổi voucher
- [VOUCHER_USAGE_GUIDE.md](VOUCHER_USAGE_GUIDE.md) - Sử dụng voucher
- [WALLET_SPLIT_BALANCE_IMPLEMENTATION.md](WALLET_SPLIT_BALANCE_IMPLEMENTATION.md) - Ví

---

## 🎉 Summary

Hệ thống store **hoàn chỉnh** với:
- ✅ Product listing & filtering
- ✅ Purchase with balance_coc/balance_thuong
- ✅ Voucher integration
- ✅ Stock management
- ✅ Purchase history
- ✅ Payment tracking

---

**Last Updated**: December 14, 2025  
**Status**: ✅ Ready to Deploy
