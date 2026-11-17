# Thiệp cưới Đỗ Trường & Nguyễn Duyên — bản local

Bản dựng lại (clone) của `https://chungdoi.com/i/batruong-thiduyen-cherish`, chạy hoàn toàn offline trên máy.

## Chạy thử

```bash
cd D:\truongduyen\web
npm install
npm start
```

Mở: <http://localhost:4321>

Hoặc nháy đúp `start.bat`.

> Phải chạy qua `npm start` (không mở trực tiếp `index.html` bằng file://), vì đường dẫn font/ảnh bắt đầu bằng `/` và phần bình luận / xác nhận cần API local.

Mẹo: thêm `?open=1` vào URL để bỏ qua màn hình mở thiệp.

## Đã có gì

| Phần | Trạng thái |
|---|---|
| Thiệp mở đầu (phong bao, con dấu, hoa rơi, nút "Mở thiệp") | Có, kèm hiệu ứng mở + confetti 囍 |
| Nhạc nền (31s → 341s) + nút bật/tắt | Có (mp3 local) |
| Ảnh bìa, thông tin lễ cưới, gia đình hai bên | Có |
| Album 17 ảnh: carousel 3D, tự chuyển, vuốt, lightbox, thumbnail | Có |
| Đếm ngược + lịch tháng 11/2026 + "Thêm vào lịch" | Có (đếm ngược chạy thật) |
| Đăng ký tham dự (RSVP) | Có, lưu vào `data/rsvp.json` |
| Sổ lưu bút (bình luận) | Có, lưu vào `data/comments.json` |
| Hộp quà mừng + QR Techcombank/Vietcombank + "Lưu QR" | Có (QR local) |
| Bản đồ + "Chỉ đường" | Có (Google Maps embed không cần API key) |

Bố cục được đo và so khớp với bản gốc: 12 khối nội dung có chiều cao **trùng khít từng pixel** ở cả 390px và 1440px.

## Cấu trúc

```
web/
├─ index.html              # trang duy nhất (markup lấy từ bản render thật)
├─ css/local.css           # bổ sung: keyframes, hiệu ứng mở phong bao, dialog
├─ js/app.js               # toàn bộ tương tác (vanilla JS, không framework)
├─ server.mjs              # static server + API local
├─ data/                   # comments.json, rsvp.json (dữ liệu local)
├─ _next/static/css/       # CSS gốc của chungdoi (giữ nguyên, 2 file)
├─ fonts/  uploads/  images/  music/  api/qr/
├─ tools/                  # script build & kiểm thử (không cần khi chạy)
├─ reference/              # HTML/screenshot gốc dùng để đối chiếu
└─ qa/                     # screenshot kiểm thử
```

`index.html` được sinh tự động bởi `npm run build` (script `tools/build-html.mjs`) từ dữ liệu đã capture. Sửa tay trực tiếp vẫn được, nhưng nếu chạy build lại thì thay đổi trong `index.html` sẽ mất — khi đó hãy sửa trong `tools/build-html.mjs` hoặc trong `js/app.js` / `css/local.css`.

## Kiểm thử

```bash
node tools/test-functional.mjs   # 25 kiểm tra: mở thiệp, nhạc, gallery, lightbox, RSVP, quà, lưu bút
node tools/qa-local.mjs          # chụp screenshot mobile + desktop vào qa/
node tools/compare-metrics.mjs   # so chiều cao từng section với bản gốc đang online
```

## Khác biệt so với bản online (có chủ đích)

- Bỏ toàn bộ tracking (GTM, Facebook Pixel, Bing, Yandex, Lemon Squeezy, activity-log).
- Nhạc, ảnh, QR, font đều tải về local.
- Bản đồ dùng embed công khai thay cho API key của chungdoi.
- Nút "Tạo lời chúc bằng AI" (🪄) hiện sinh lời chúc mẫu ngẫu nhiên thay vì gọi AI.
- Bình luận & RSVP lưu local; sẽ thay bằng Google Sheet ở bước sau.

## Bước tiếp theo (giai đoạn 2)

Thay 2 phần trong `js/app.js` bằng phiên bản giống `D:\Thiep-cuoi-van-anh`:

1. `RSVP` — hàm `mountRsvp()` đang `fetch('/api/rsvp')`.
2. `Guestbook` — `loadComments()` và submit đang `fetch('/api/comments')`.

Chỉ cần đổi `fetch(...)` sang URL Google Apps Script (`.../exec`) và giữ nguyên payload `{ name, message }` / `{ name, attending }`, phần UI không phải sửa.
