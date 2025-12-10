# ProfileDrawer Backup - Phiên Bản Cũ

## 📋 Thông Tin Backup

- **File Backup:** `src/components/ProfileDrawer.old.jsx` (2670 dòng)
- **Commit Gốc:** `227aae8` - "feat: show QR tokens for donations and bounties"
- **Ngày Tạo:** 2025-12-10
- **Lý Do:** Lưu phiên bản cũ trước khi cập nhật quy trình 8 bước

## 🔄 Thay Đổi So Với Phiên Bản Cũ

### Version Cũ (2670 dòng):
- Sử dụng hệ thống adoption requests phức tạp
- Có các trạng thái: pending, accepted, ready_to_deliver, delivered, completed, rejected
- Hỗ trợ quét QR delivery token
- Hỗ trợ checkin xác nhận trong 30 ngày
- Có timeline hoạt động (AdoptionActivityTimeline)
- Hỗ trợ rating sau khi checkin

### Version Mới (416 dòng):
- Đơn giản hóa thành hệ thống deposits
- Chỉ 2 trạng thái chính: pending (chờ xác nhận), confirmed (khóa 3 ngày)
- Countdown timer tự động cho 3 ngày khóa cọc
- Đánh giá trong khoảng 3 ngày khóa
- Auto-complete sau 3 ngày (nếu không đánh giá)

## 📌 Flow 8 Bước (Mới)

1. **Người nhận đặt cọc** (status: pending, chưa khóa)
2. **Chủ bài thấy danh sách** người cọc
3. **Hai bên liên hệ ngoài** hệ thống
4. **Khi gặp: quét QR** hoặc chọn người nhận
5. **Xác nhận giao mèo** → khóa cọc 3 ngày
6. **Trong 3 ngày** chủ bài có thể đánh giá
7. **Nếu đánh giá tốt** → người nhận nhận voucher
8. **Sau 3 ngày** không đánh giá → auto đánh giá tốt

## 🔗 Cách Dùng Backup

Nếu cần khôi phục phiên bản cũ:
```bash
cp src/components/ProfileDrawer.old.jsx src/components/ProfileDrawer.jsx
git add src/components/ProfileDrawer.jsx
git commit -m "restore: revert to old adoption requests flow"
```

## 📊 So Sánh

| Khía Cạnh | Cũ | Mới |
|-----------|-----|-----|
| Số dòng code | 2670 | 416 |
| Độ phức tạp | Cao | Thấp |
| Số trạng thái | 6+ | 2 |
| Hỗ trợ checkin | Có (30 ngày) | Không |
| Hỗ trợ QR delivery | Có | Có (qua buttons) |
| Countdown timer | Không | Có (3 ngày) |
| Timeline hoạt động | Có | Không |
| Auto-complete | Không | Có (sau 3 ngày) |
