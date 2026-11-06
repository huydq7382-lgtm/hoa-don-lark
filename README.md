# Sổ hoá đơn dịch vụ — bảng 2.1 Tạo đơn hàng

Nhập đơn vào bảng **2.1 Tạo đơn hàng** (base Sương Nguyễn Studio) trên giao diện giống tờ hoá đơn giấy. Có 2 cách chạy, dùng chung giao diện:

| | Cách 1 — tiện ích trong Lark | Cách 2 — web app riêng (đang dùng) |
|---|---|---|
| Link | https://huydq7382-lgtm.github.io/hoa-don-lark/ (GitHub Pages) | https://hoa-don.sepay-lark-webhook.workers.dev (Cloudflare Worker) |
| Đăng nhập | tài khoản Lark đang mở | mã nhân viên riêng (8 ký tự) |
| Cột "Kinh Doanh" | đúng người | là app; người lập ghi ở cột **"Sale phụ trách"** |
| Điện thoại | hạn chế | chạy tốt |

## Cấu trúc
- `index.html`, `style.css`, `app.js`: giao diện (không biết gì về Lark).
- `data-lark.js` + `sdk/`: cách 1, SDK tiện ích `@lark-base-open/js-sdk@1.0.2`.
- `data-worker.js` + `worker/`: cách 2. `worker/src/worker.js` giữ App Secret, kiểm tra mã nhân viên và gọi Lark Open API bằng tenant token.
- `data-demo.js`: dữ liệu giả, dùng khi mở ngoài Lark (thêm `?demo` để ép).

`app.js` tự nhận cách chạy: có `/api/me` thì dùng cách 2, nằm trong khung Lark thì dùng cách 1, còn lại là bản xem thử.

## Cách 2: vận hành
- Đưa bản mới lên: `cd worker && ./deploy.sh`. Thêm `--secrets` để nạp lại cả 3 secret: `LARK_APP_SECRET` (từ cấu hình MCP lark), `SESSION_KEY` và `STAFF` (từ `~/.config/hoa-don/`).
- Mã nhân viên chỉ nằm ở `~/.config/hoa-don/staff.json` trên máy Quang Huy, KHÔNG ghi vào repo hay wiki. Thêm người, đổi mã hoặc khoá mã: sửa file đó rồi `./deploy.sh --secrets`. Đổi mã thì phiên đăng nhập cũ của người đó mất hiệu lực ngay.
- Phiên đăng nhập kéo dài 60 ngày (cookie ký HMAC).

## Chưa làm (cố ý)
Ô Thuê váy / Thuê vest / Phụ kiện: tra giá ở 2.1 đang sai (trả cả danh sách ~70 giá, và vest/phụ kiện đều tra theo ô "Thuê Váy"). Hiện mới có 4 đơn dùng các ô này.
