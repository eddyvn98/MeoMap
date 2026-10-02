# Database

Database của MeoMap chỉ phục vụ tài khoản, case thú cưng và hoạt động cứu hộ.

## Nhóm dữ liệu chính

- `profiles`: hồ sơ người dùng.
- `pets`: case nhận nuôi, đi lạc và cứu hộ.
- `rescue_appeals`: lời kêu gọi hỗ trợ do người cứu tự đăng.
- `rescue_updates`: cập nhật tình hình ca cứu hộ.

## Tiền và quyên góp

MeoMap không lưu số dư, giữ cọc, quản lý voucher, cửa hàng, thưởng hoặc giao dịch quyên góp.

Thông tin ngân hàng của người cứu (nếu sử dụng) chỉ là dữ liệu hiển thị để cộng đồng chuyển trực tiếp cho người cứu; MeoMap không đứng giữa giao dịch.

## Cleanup

Migration `cleanup_removed_finance_features.sql` dùng để loại các bảng/function/cột tài chính legacy sau khi sao lưu dữ liệu production cần thiết.
