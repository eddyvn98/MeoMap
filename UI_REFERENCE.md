# 🎨 UI/UX REFERENCE - ADOPTION REQUESTS FLOW

## Screen 1: Pet Detail Page - Receiver View (Before)

```
┌─────────────────────────────────────┐
│ ← Quay lại                          │
│                                     │
│ Mèo cam đặt thương                 │
│ Status: available                   │
│ Khu vực: Quận 1                     │
│                                     │
│ [Pet Image]                         │
│                                     │
│ Mèo cam đặt thương, vui nhộn,       │
│ yêu thích chơi...                   │
│                                     │
│ Cọc cao nhất hiện tại:              │
│ 0 đ                                 │
│                                     │
│ Số tiền bạn muốn cọc:               │
│ [50000] đ                           │
│                                     │
│ 💰 Số dư ví: 100,000 đ              │
│                                     │
│ [Đặt cọc & hiện mã QR]             │
│                                     │
│ [Nút quét mã] [...]                │
│                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ NEW!
│ 📞 Liên hệ nhận mèo này             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
└─────────────────────────────────────┘
```

---

## Screen 2: Contact Request Sent

```
┌─────────────────────────────────────┐
│ ← Quay lại                          │
│                                     │
│ [Pet Image]                         │
│                                     │
│ ┌─ ⏳ CHỜ PHẢN HỒI ─────────────┐  │
│ │ Yêu cầu đang chờ chủ bài      │  │
│ │ phản hồi...                   │  │
│ └───────────────────────────────┘  │
│                                     │
│ Cọc cao nhất: 0 đ                  │
│ Số tiền muốn cọc: [50000] đ        │
│ 💰 Số dư ví: 100,000 đ             │
│ [Đặt cọc & hiện mã QR]            │
│                                     │
└─────────────────────────────────────┘
```

---

## Screen 3: Request Accepted - Show Contact Info

```
┌─────────────────────────────────────┐
│ ← Quay lại                          │
│                                     │
│ ┌─ ✅ ACCEPTED ─────────────────┐   │
│ │ Chủ bài đã chấp nhận bạn!     │   │
│ │                              │   │
│ │ ┌──────────────────────────┐ │   │
│ │ │ 📞 Liên hệ chủ bài:     │ │   │
│ │ │ 👤 Nguyễn Văn A         │ │   │
│ │ │ ✉️ nguyenvana@email.com │ │   │
│ │ │ 📱 0901999999           │ │   │
│ │ └──────────────────────────┘ │   │
│ │                              │   │
│ │ ⏳ Xác nhận hẹn gặp:         │   │
│ │ ☐ Tôi đã hẹn gặp với chủ bài│   │
│ │                              │   │
│ │ ⏳ Chủ bài chưa xác nhận     │   │
│ └────────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## Screen 4: Both Confirmed - Show QR Code

```
┌─────────────────────────────────────┐
│ ← Quay lại                          │
│                                     │
│ ✅ Chủ bài đã chấp nhận bạn!        │
│                                     │
│ 📞 Thông tin liên hệ chủ bài:       │
│ ✉️ nguyenvana@email.com             │
│ 📱 0901999999                       │
│                                     │
│ ☑️ Tôi đã hẹn gặp với chủ bài      │
│ ✅ Chủ bài đã xác nhận              │
│                                     │
│ ┌─ 📱 MÃ XÁC NHẬN NHẬN MÈO ────┐  │
│ │                             │  │
│ │      ┌─────────────┐        │  │
│ │      │  [QR CODE]  │        │  │
│ │      │   ▀▀▀▀▀▀▀   │        │  │
│ │      └─────────────┘        │  │
│ │                             │  │
│ │  Mã dự phòng: ABC12345      │  │
│ │                             │  │
│ │  Khi gặp chủ bài, mở        │  │
│ │  màn hình này để họ quét mã. │  │
│ └─────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## Screen 5: Owner View - List of Requests

```
┌─────────────────────────────────────┐
│ ← Quay lại                          │
│                                     │
│ 🏠 Bạn là người đăng bài này       │
│                                     │
│ 📍 Tiến trình giao mèo:            │
│ [✓ Chờ người nhận] [● Chờ xác nhận]│
│ [○ Giao mèo]      [○ Đánh giá]    │
│                                     │
│ [✏️ Sửa bài] [📋 Đóng bài]        │
│                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ NEW  │
│ 👥 Người muốn nhận mèo (1)          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│                                     │
│ ┌─ Nguyễn Văn B ───────────────┐  │
│ │ ⏳ Chờ bạn phản hồi          │  │
│ │                             │  │
│ │ [✅ Chấp nhận] [❌ Từ chối]  │  │
│ └─────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## Screen 6: Owner Accept - Show Contact

```
┌─────────────────────────────────────┐
│ ← Quay lại                          │
│                                     │
│ 👥 Người muốn nhận mèo (1)          │
│                                     │
│ ┌─ Nguyễn Văn B ───────────────┐  │
│ │ ✅ Đã chấp nhận              │  │
│ │                             │  │
│ │ ┌──────────────────────────┐ │  │
│ │ │ 📞 Liên hệ:             │ │  │
│ │ │ ✉️ nguyenvb@email.com   │ │  │
│ │ │ 📱 0902888888           │ │  │
│ │ └──────────────────────────┘ │  │
│ │                             │  │
│ │ ☐ Tôi đã hẹn gặp            │  │
│ │ ⏳ Chờ người nhận xác nhận... │  │
│ │                             │  │
│ └─────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## Screen 7: Owner Confirmed - Show Deliver Button

```
┌─────────────────────────────────────┐
│ ← Quay lại                          │
│                                     │
│ 👥 Người muốn nhận mèo (1)          │
│                                     │
│ ┌─ Nguyễn Văn B ───────────────┐  │
│ │ 🚀 Sẵn sàng giao             │  │
│ │                             │  │
│ │ 📞 Liên hệ: nguyenvb@...   │  │
│ │                             │  │
│ │ ☑️ Tôi đã hẹn gặp           │  │
│ │ ✅ Người nhận đã xác nhận    │  │
│ │                             │  │
│ │ [✅ Quét mã & Xác nhận giao] │  │
│ │         mèo                │  │
│ │                             │  │
│ └─────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## Screen 8: Delivery Confirmation Page

```
┌─────────────────────────────────────┐
│ ← Quay lại                          │
│                                     │
│ ┌─ ✅ XÁC NHẬN GIAO MÈO ────────┐  │
│ │                              │  │
│ │ 🐱 Mèo cam đặt thương        │  │
│ │ [Pet Image]                  │  │
│ │                              │  │
│ │ 👤 Người nhận:                │  │
│ │ Nguyễn Văn B                 │  │
│ │ 📱 0902888888                │  │
│ │                              │  │
│ │ 💰 Số tiền cọc: 50,000 đ     │  │
│ │                              │  │
│ │ 🔐 Nhập mã xác nhận:          │  │
│ │ [_________________] (ABC12345)│  │
│ │                              │  │
│ │ [✅ Xác nhận giao mèo]        │  │
│ │                              │  │
│ │ Hướng dẫn:                    │  │
│ │ • Yêu cầu người nhận mở QR    │  │
│ │ • Nhập mã từ màn hình họ      │  │
│ │ • Hoặc nhập tay mã dự phòng  │  │
│ │ • Bấm xác nhận giao mèo       │  │
│ │                              │  │
│ └──────────────────────────────┘  │
│                                     │
│ [← Hủy]                             │
│                                     │
└─────────────────────────────────────┘
```

---

## Screen 9: After Delivery - Pet Status Updated

```
┌─────────────────────────────────────┐
│ ← Quay lại                          │
│                                     │
│ Mèo cam đặt thương                 │
│ Status: ✅ delivered                │
│ Khu vực: Quận 1                     │
│                                     │
│ [Pet Image]                         │
│                                     │
│ ┌─ ✅ ĐÃ GIAO MÈO ─────────────┐  │
│ │ thành công                   │  │
│ │                              │  │
│ │ Người nhận: Nguyễn Văn B     │  │
│ │ Thời gian: 08/12/2025 14:30  │  │
│ │                              │  │
│ │ [📋 Xem hồ sơ nhận nuôi]     │  │
│ │ [⭐ Đánh giá người nhận]      │  │
│ └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## Color Reference

```
Primary Colors:
- ✅ Success: #10b981 (Green)
- ⏳ Waiting: #fcd34d (Yellow)
- ❌ Error: #ef4444 (Red)
- 📞 Info: #0369a1 (Blue)
- 🔐 Important: #5b21b6 (Purple)

Background Colors:
- Success bg: #f0fdf4
- Waiting bg: #fffbeb
- Error bg: #fee2e2
- Info bg: #f0f9ff
- Important bg: #f5f3ff

Text Colors:
- Dark: #1e293b
- Medium: #334155
- Light: #64748b
- Muted: #94a3b8
```

---

## Button Styles

```
Primary (CTA):
Background: #0369a1 or #10b981
Text: White
Size: 48px height
Radius: 8px
Font Weight: 600

Secondary:
Background: #fff
Text: #334155
Border: 1px solid #e2e8f0
Size: 40px height
Radius: 6px

Danger:
Background: #ef4444
Text: White
Size: 40px height
Radius: 4px
```

---

## Modal/Alert Examples

```
Success:
┌──────────────────────────┐
│ ✅ Đã gửi yêu cầu!       │
│ Chờ chủ bài chấp nhận.   │
│                          │
│        [OK]              │
└──────────────────────────┘

Confirmation:
┌──────────────────────────┐
│ Bạn chắc chắn đã giao    │
│ mèo cho người nhận?      │
│                          │
│   [Có, đã giao] [Hủy]   │
└──────────────────────────┘
```

---

## Responsive Design

```
Mobile (< 640px):
- Full width: 100% - 20px padding
- Single column layout
- Touch-friendly buttons: min 48x48px
- QR code: 200x200px

Tablet (640px - 1024px):
- Max width: 600px centered
- Same single column
- Slightly larger spacing

Desktop (> 1024px):
- Max width: 500px or full layout
- Better spacing
- Optional sidebar info
```

---

## Accessibility

```
✅ Alt text on images
✅ Aria labels on buttons
✅ Keyboard navigation (Tab key)
✅ Color not only indicator (icons too)
✅ Sufficient contrast (WCAG AA)
✅ Form labels associated
✅ Error messages descriptive
```

---

## Animation/Transitions

```
Smooth transitions: 200ms ease-in-out
- Status changes
- Button hover
- Modal appearance

Loading spinner: rotateZ 360deg infinite 2s
```

---

**Last Updated:** December 8, 2025
