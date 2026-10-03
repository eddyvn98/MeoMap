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
Khi local server chỉ nhận traffic qua `cloudflared`, đặt
`TRUST_PROXY_HEADERS=1` để rate-limit nhận đúng IP người dùng. Không bật tùy
chọn này nếu server được expose trực tiếp và proxy header không đáng tin.

Nếu frontend chạy khác origin với API, khai báo origin cụ thể qua
`CORS_ORIGINS`; mặc định server chỉ cho phép browser cùng host.

## Dữ liệu

Dữ liệu runtime được tạo tự động:

- `server/data/db.json`: users, profiles, cases, rescue appeals/updates, sessions.
- `server/data/db.json.bak`: bản backup tự động của lần ghi trước.
- `server/data/uploads/`: ảnh upload.

Hai vị trí này đã được git-ignore để không đẩy dữ liệu cá nhân lên GitHub.

### Backup

Chỉ cần sao lưu:

```
server/data/db.json
server/data/db.json.bak
server/data/uploads/
```

## Auth local

- Tài khoản được lưu trong local JSON database.
- Password không lưu plaintext; server hash bằng `scrypt`.
- Session token có hạn 30 ngày; database chỉ lưu SHA-256 hash của token mới.
- Không có xác nhận email vì không còn dịch vụ email/auth cloud.

## API nội bộ

Frontend dùng `src/localClient.js`. Local client cung cấp auth, query, upload và các action rescue cần thiết qua `/api`.

Không cần API key hoặc secret cloud.

## Bảo vệ mặc định

- Login/signup/upload/API mutation có rate-limit trong tiến trình Node.
- Upload chỉ nhận JPG/PNG/WebP/GIF hợp lệ, tối đa 8 MB; tên file do server sinh.
- Query mutation dùng allowlist field và kiểm tra owner/rescuer ở server.
- Response public không trả contact/tài khoản ngân hàng trong list/map; dữ liệu
  này chỉ có ở truy vấn chi tiết case.
- Các request ghi API được tuần tự hóa trong một tiến trình để tránh hai request
  cùng ghi đè `db.json`.
- Nếu `db.json` hỏng JSON, server ưu tiên phục hồi từ `db.json.bak` thay vì
  khởi tạo database rỗng và ghi đè dữ liệu.

Kiến trúc JSON local này phù hợp một tiến trình Node. Không chạy nhiều instance
Node cùng trỏ vào một thư mục `server/data`; nếu cần scale nhiều instance, hãy
chuyển persistence sang database có transaction.
