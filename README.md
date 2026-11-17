# Thiệp cưới Đỗ Trường & Nguyễn Duyên

Bản dựng lại (clone) của `https://chungdoi.com/i/batruong-thiduyen-cherish`, có sổ lưu bút và xác nhận tham dự lưu trên Google Sheet.

- Repo: <https://github.com/truongduyenlove/truongduyen>
- Google Sheet: <https://docs.google.com/spreadsheets/d/1718q2_v_1hXQL4ZQCVsnswZZqKiYFrPuVWQJ3eM_xVQ/edit>

## Chạy local

```bash
cd D:\truongduyen\web
npm install
npm start
```

Mở: <http://localhost:4321> — hoặc nháy đúp `start.bat`.

Mẹo: thêm `?open=1` vào URL để bỏ qua màn hình mở thiệp.

## Đưa lên GitHub Pages

1. Vào repo → **Settings → Pages**.
2. *Source*: **Deploy from a branch** → Branch `main`, thư mục `/ (root)` → **Save**.
3. Sau ~1 phút: <https://truongduyenlove.github.io/truongduyen/>

Đường dẫn trong site đã là **tương đối** nên chạy được cả ở gốc domain và ở thư mục con `/truongduyen/`.
File `.nojekyll` đã có để GitHub Pages phục vụ thư mục `_next/`.

## Bật Google Sheet (bắt buộc để bình luận/RSVP hoạt động online)

1. Mở Google Sheet ở trên → **Extensions → Apps Script**.
2. Dán toàn bộ nội dung `google-apps-script/Code.gs` vào `Code.gs` → **Save**.
3. Chạy hàm `setup()` một lần, cấp quyền khi Google hỏi (tạo 3 trang: `RSVP`, `Wishes`, `Tổng hợp`).
4. **Deploy → New deployment → Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
   - **Deploy** → copy **Web app URL** (`https://script.google.com/macros/s/.../exec`).
5. Dán URL đó vào `js/config.js`:

```js
window.WEDDING_CONFIG = {
  appScriptUrl: 'https://script.google.com/macros/s/.../exec'
};
```

6. Commit + push lại. Xong: lời chúc và xác nhận tham dự sẽ ghi vào Sheet và hiển thị lại trên web.

Khi `appScriptUrl` để trống, site tự dùng API local (`data/*.json`) — tiện cho việc chạy thử trên máy.

## Đã có gì

| Phần | Trạng thái |
|---|---|
| Thiệp mở đầu (phong bao, con dấu, hoa rơi, nút "Mở thiệp") | Có, kèm hiệu ứng mở + confetti 囍 |
| Nhạc nền (31s → 341s) + nút bật/tắt | Có (mp3 local) |
| Ảnh bìa, thông tin lễ cưới, gia đình hai bên | Có |
| Tiệc cưới 16:00 thứ Sáu 27/11 + Lễ thành hôn 06:00 thứ Bảy 28/11 | Có |
| Đếm ngược + lịch tháng 11/2026 (đánh dấu 27 & 28) + "Thêm vào lịch" | Có |
| Album 17 ảnh: carousel 3D, tự chuyển, vuốt, lightbox, thumbnail | Có |
| Đăng ký tham dự (RSVP) + số người | Có — lưu Google Sheet, đọc lại bằng JSONP |
| Sổ lưu bút | Có — lưu Google Sheet, tự làm mới mỗi 45s |
| Hộp quà mừng + QR Techcombank/Vietcombank + "Lưu QR" | Có (QR local) |
| Bản đồ + "Chỉ đường" | Có (Google Maps embed không cần API key) |

Giao diện đo và so khớp với bản gốc: 12 khối nội dung có chiều cao trùng khít ở cả 390px và 1440px (phần lịch/sự kiện đã sửa theo yêu cầu).

## Cấu trúc

```
web/
├─ index.html                 # trang duy nhất (đường dẫn tương đối)
├─ css/local.css              # keyframes, hiệu ứng mở phong bao, dialog
├─ js/config.js               # URL Google Apps Script
├─ js/app.js                  # toàn bộ tương tác (vanilla JS)
├─ server.mjs                 # static server + API local (chỉ để chạy thử)
├─ google-apps-script/Code.gs # backend Google Sheet
├─ data/                      # dữ liệu local khi chưa cấu hình Sheet
├─ _next/static/css/          # CSS gốc của chungdoi
├─ fonts/  uploads/  images/  music/  api/qr/
├─ tools/                     # build & kiểm thử
├─ reference/                 # HTML/screenshot gốc để đối chiếu
└─ qa/                        # screenshot kiểm thử
```

`index.html` được sinh bởi `npm run build` (`tools/build-html.mjs`) từ dữ liệu đã capture. Muốn sửa nội dung lâu dài thì sửa trong `tools/build-html.mjs`, `js/app.js` hoặc `css/local.css` rồi build lại, tránh sửa trực tiếp `index.html`.

## Kiểm thử

```bash
node tools/test-functional.mjs   # luồng đầy đủ: mở thiệp, nhạc, gallery, lightbox, RSVP, quà, lưu bút
node tools/test-pages.mjs        # kiểm tra chạy ở gốc domain, ở /truongduyen/, và luồng Google Sheet
node tools/qa-local.mjs          # chụp screenshot mobile + desktop vào qa/
node tools/compare-metrics.mjs   # so chiều cao từng section với bản gốc đang online
```

## Khác biệt so với bản online

- Bỏ toàn bộ tracking (GTM, Facebook Pixel, Bing, Yandex, Lemon Squeezy, activity-log).
- Nhạc, ảnh, QR, font tải về local; bản đồ dùng embed công khai thay cho API key của chungdoi.
- Nút "Tạo lời chúc bằng AI" (🪄) sinh lời chúc mẫu ngẫu nhiên.
- Lời chúc lưu đệm trên thiết bị rồi đồng bộ lên Google Sheet (offline-first); xác nhận tham dự gửi thẳng lên Sheet.
