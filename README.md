# Hoá đơn dịch vụ — tiện ích Lark Base cho bảng 2.1

Nhập đơn vào bảng **2.1 Tạo đơn hàng** (base Sương Nguyễn Studio) trên giao diện giống tờ hoá đơn giấy.

- `index.html`, `style.css`, `app.js`: giao diện. Phần này không biết gì về Lark.
- `data-lark.js`: đọc/ghi Lark qua SDK tiện ích (`sdk/` là `@lark-base-open/js-sdk@1.0.2`). Đơn được ghi bằng tài khoản người đang mở, nên cột "Kinh Doanh" (Người tạo) đúng tên.
- `data-demo.js`: dữ liệu giả để xem thử khi mở link ngoài Lark (hoặc thêm `?demo` vào link).

## Gắn vào Lark
Base → bảng 2.1 → **Tiện ích / Extensions** → **Thêm tiện ích** → **Tiện ích tuỳ chỉnh (Custom)** → dán link GitHub Pages của repo này.

## Đổi sang web app riêng (cách 2)
Viết `data-worker.js` export đúng các hàm như `data-lark.js` (`init`, `createCustomer`, `createOrder`, `loadOrder`, `updateOrder`, …) và gọi Cloudflare Worker. Worker giữ App Secret và ghi qua Open API. Lưu ý: khi đó cột "Kinh Doanh" sẽ là bot, nên cần thêm ô "Sale phụ trách". `app.js` không cần sửa.

## Chưa làm (cố ý)
Ô Thuê váy / Thuê vest / Phụ kiện: tra giá ở 2.1 đang sai (trả cả danh sách ~70 giá, và vest/phụ kiện đều tra theo ô "Thuê Váy"). Hiện mới có 4 đơn dùng các ô này.
