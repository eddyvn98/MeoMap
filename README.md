# MeoMap — Local Server

MeoMap chạy hoàn toàn trên máy/local server. Không dùng Supabase, Firebase hoặc database cloud.

## Kiến trúc

```
Browser / LAN clients
        │
        ▼
Vite/React frontend
        │  /api + /uploads
        ▼
Node local server (server/index.js)
        │
        ├── server/data/db.json
        └── server/data/uploads/
```

Backend chỉ dùng module built-in của Node.js, không cần Docker và không cần cài database riêng.

## Luồng sản phẩm

- **Nhận nuôi:** đăng case → liên hệ trực tiếp → chủ bài đóng case.
- **Đi lạc:** đăng case → liên hệ trực tiếp → chủ bài đóng case.
- **Cứu hộ:** user nhận ca → tự đăng lời kêu gọi + thông tin tài khoản → cộng đồng hỗ trợ trực tiếp → đóng ca.
- MeoMap không quản lý ví, cọc, voucher, cửa hàng hoặc tiền quyên góp.

## Cài đặt

Yêu cầu Node.js 20+.

```bash
npm install
npm run dev
```

- Web dev: `http://localhost:5173`
- Local API: `http://localhost:8787`
- Health check: `http://localhost:8787/api/health`

`npm run dev` chạy đồng thời frontend và local API.

## Chạy như local server production

```bash
npm install
npm run build
npm start
```

Sau khi build, Node server tự phục vụ thư mục `dist/`, API và ảnh upload trên cùng một cổng (mặc định `8787`).

Máy khác trong LAN có thể truy cập:

```
http://IP-MAY-CHU:8787
```

Nếu dùng Cloudflare Tunnel, tunnel trực tiếp tới `http://localhost:8787`.

## Dữ liệu

Dữ liệu runtime được tạo tự động:

- `server/data/db.json`: users, profiles, cases, rescue appeals/updates, sessions.
- `server/data/uploads/`: ảnh upload.

Hai vị trí này đã được git-ignore để không đẩy dữ liệu cá nhân lên GitHub.

### Backup

Chỉ cần sao lưu:

```
server/data/db.json
server/data/uploads/
```

## Auth local

- Tài khoản được lưu trong local JSON database.
- Password không lưu plaintext; server hash bằng `scrypt`.
- Session token có hạn 30 ngày và lưu local.
- Không có xác nhận email vì không còn dịch vụ email/auth cloud.

## API nội bộ

Frontend dùng `src/localClient.js`. Local client cung cấp auth, query, upload và các action rescue cần thiết qua `/api`.

Không cần API key hoặc secret cloud.
