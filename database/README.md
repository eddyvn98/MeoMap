# Database Schema Documentation

Thư mục này chứa các file SQL định nghĩa cấu trúc bảng trên Supabase.

**Lưu ý:** Các file SQL này chỉ để tham khảo cấu trúc bảng, KHÔNG dùng để chạy migration tự động. Tất cả thay đổi schema phải được thực hiện trực tiếp trên Supabase Dashboard hoặc SQL Editor.

## Các bảng chính:

### Core Tables (Bảng chính)
- **`profiles.sql`** - Thông tin người dùng, ví tiền, liên hệ
- **`pets.sql`** - Thông tin thú cưng (lost/adopt)
- **`deposits.sql`** - Quản lý tiền cọc, thanh toán

### Adoption System (Hệ thống nhận nuôi)
- **`adoption_requests.sql`** - Yêu cầu nhận nuôi (flow từ contact → delivery)
- **`adoption_checkins.sql`** - Theo dõi check-in sau khi nhận nuôi
- **`adoption_tickets.sql`** - Vé giao thú cưng (QR/Token)
- **`adoptions.sql`** - Lịch sử nhận nuôi thành công

### Rating & Report System (Đánh giá & Báo cáo)
- **`adoption_ratings.sql`** - Đánh giá sau giao dịch
- **`adoption_feedback.sql`** - Phản hồi từ chủ cũ
- **`adoption_reports.sql`** - Báo cáo vi phạm

### Wallet System (Hệ thống ví)
- **`wallet_transactions.sql`** - Lịch sử giao dịch ví

### Views (Các view thống kê)
- **`user_reputation.sql`** - Thống kê uy tín người dùng
- **`user_report_stats.sql`** - Thống kê báo cáo vi phạm

## Tổng quan quan hệ:

```
profiles (users)
  ├── pets (owned pets)
  │   └── adoption_requests
  │       ├── adoption_tickets (QR codes)
  │       └── adoptions (successful adoptions)
  │           ├── adoption_checkins (follow-ups)
  │           ├── adoption_ratings (ratings)
  │           └── adoption_feedback (feedback)
  ├── deposits (payment records)
  │   └── wallet_transactions
  └── adoption_reports (violation reports)
```

## Cách sử dụng:

1. **Khi cần hiểu cấu trúc bảng:** Mở file SQL tương ứng
2. **Khi thêm/sửa bảng trên Supabase:** Cập nhật file SQL ở đây để đồng bộ
3. **Khi code feature mới:** Tham khảo các file này để query đúng columns/relationships
4. **Luôn đồng bộ:** Schema trong các file này phải match với Supabase thực tế

## Lưu ý quan trọng:

- ⚠️ **KHÔNG chạy trực tiếp các file này** trên Supabase (có thể gây xung đột)
- ✅ Dùng để **tham khảo** khi code hoặc thiết kế feature
- 🔄 Cập nhật file khi có thay đổi schema trên Supabase
- 📝 Mỗi file có comment giải thích mục đích của bảng
