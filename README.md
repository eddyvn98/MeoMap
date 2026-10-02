# MeoMap

MeoMap là web app cộng đồng để đăng và tìm các case thú cưng theo bản đồ.

## Luồng sản phẩm

### Nhận nuôi
Đăng case → người quan tâm liên hệ trực tiếp → chủ bài đóng case khi đã tìm được người nhận.

### Đi lạc
Đăng case → cộng đồng liên hệ trực tiếp khi có thông tin → chủ bài đóng case khi đã tìm thấy.

### Cứu hộ
Người dùng nhận ca → cập nhật tình hình → tự đăng lời kêu gọi và thông tin nhận hỗ trợ → đóng ca khi hoàn thành.

## Nguyên tắc tài chính

MeoMap không quản lý tiền của người dùng:
- không ví;
- không cọc;
- không voucher;
- không cửa hàng;
- không giữ hoặc trả thưởng;
- không nhận, đối soát hoặc giải ngân quyên góp.

Với cứu hộ, người cứu có thể đăng thông tin tài khoản của chính mình. Người ủng hộ chuyển trực tiếp cho người cứu ngoài hệ thống MeoMap.

## Công nghệ

- React + Vite
- React Router
- Leaflet / React Leaflet
- Supabase Auth, Database và Storage

## Route chính

- `/`, `/map` — bản đồ và danh sách case
- `/pet/:id` — chi tiết case
- `/report` — đăng case
- `/account` — case của tôi
- `/rescuer` — tìm và quản lý ca cứu hộ
- `/profile/:userId` — hồ sơ người dùng
- `/how-it-works`, `/faq` — hướng dẫn

## Database

Schema đang được đơn giản hóa quanh các bảng cốt lõi như `profiles`, `pets`, cùng dữ liệu cập nhật cứu hộ. Các bảng tài chính legacy đã bị loại khỏi codebase và có migration cleanup riêng.
