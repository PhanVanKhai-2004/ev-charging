# 🚗 EV Charging Station Backend API

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin%20SDK-orange)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> RESTful API cho ứng dụng đặt lịch sạc xe điện (EV Charging). Hỗ trợ quản lý trạm sạc, đặt lịch, check-in bằng GPS, thanh toán, phân quyền (driver, station owner, staff, admin) và thống kê dashboard.

---

## 📋 Mục lục
- [Tính năng chính](#-tính-năng-chính)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt và chạy local](#-cài-đặt-và-chạy-local)
- [Biến môi trường](#-biến-môi-trường)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [API Endpoints](#-api-endpoints)
- [Luồng nghiệp vụ chính](#-luồng-nghiệp-vụ-chính)
- [Xử lý lỗi & Validation](#-xử-lý-lỗi--validation)
- [Triển khai lên production](#-triển-khai-lên-production)
- [Đóng góp](#-đóng-góp)
- [Giấy phép](#-giấy-phép)

---

## ✨ Tính năng chính

### 🔐 Xác thực & phân quyền
- Đăng ký tài khoản (driver, station_owner)
- Đăng nhập qua Firebase Authentication (client SDK)
- Xác thực JWT token qua middleware `verifyToken`
- Phân quyền chi tiết: `driver`, `station_owner`, `staff`, `admin`

### 🏢 Quản lý trạm sạc (Station Owner)
- CRUD trạm sạc (tên, địa chỉ, toạ độ, giá/giờ, giờ mở cửa)
- Quản lý cổng sạc (ports): thêm, sửa, xóa, cập nhật trạng thái (available, maintenance, offline)
- Tạo tài khoản staff cho từng trạm

### 📅 Đặt lịch & Sạc (Driver)
- Tìm trạm gần nhất (theo bán kính)
- Đặt lịch trước (chọn giờ, cổng, dịch vụ đi kèm)
- Check-in bằng GPS (yêu cầu trong vòng 50m)
- Hủy lịch (trước khi check-in)
- Xem lịch sử sạc

### ⚡ Quản lý sạc (Staff/Owner)
- Xác nhận thanh toán → bắt đầu sạc (transaction atomic)
- Kết thúc sạc → giải phóng cổng & ghi lịch sử
- Check-in hộ cho driver khi lỗi GPS
- Cập nhật trạng thái cổng (bảo trì, offline)

### 👑 Admin Dashboard
- Xem danh sách user (lọc theo role), khóa/mở khóa tài khoản
- Duyệt/vô hiệu hóa trạm sạc
- Thống kê tổng quan: số user, trạm, cổng, booking hôm nay, doanh thu, tỷ lệ sử dụng

### 🛡️ Bảo mật & Độ tin cậy
- Firestore Transaction tránh race condition khi đặt lịch
- Validation dữ liệu đầu vào với `express-validator`
- Middleware kiểm tra quyền riêng cho từng tài nguyên
- Hỗ trợ check-in bằng GPS (khoảng cách thực tế)

---

## 🛠 Công nghệ sử dụng

| Công nghệ              | Mục đích                                            |
|------------------------|-----------------------------------------------------|
| **Node.js** (v20+)     | Môi trường runtime                                  |
| **Express**            | Framework web RESTful                               |
| **Firebase Admin SDK** | Xác thực, Firestore (database), FCM (thông báo)     |
| **Firestore**          | NoSQL database (users, stations, bookings, history,charging) |
| **express-validator**  | Kiểm tra dữ liệu đầu vào                            |
| **dotenv**             | Quản lý biến môi trường                             |
| **cors, helmet**       | Bảo mật cơ bản                                      |

---

## 📦 Yêu cầu hệ thống

- Node.js >= 20.x
- npm >= 10.x
- Tài khoản Firebase (dự án đã bật Authentication, Firestore)

---

## ⚙️ Cài đặt và chạy local

### Bước 1: Clone repository
```bash
git clone https://github.com/TEN_NGUOI_DUNG/ev-charging-backend.git
cd ev-charging-backend

Bước 2: Cài đặt dependencies
bash
npm install
Bước 3: Tạo file .env (xem mẫu bên dưới)
Bước 4: Lấy service account key từ Firebase Console
Vào Project settings > Service accounts > Firebase Admin SDK

Chọn “Generate new private key”

Đặt tên file là serviceAccountKey.json và đặt vào thư mục gốc (hoặc copy nội dung vào biến môi trường GOOGLE_APPLICATION_CREDENTIALS_JSON)

Bước 5: Chạy server ở môi trường development
bash
npm run dev
Server sẽ chạy tại http://localhost:5000

🔐 Biến môi trường (.env)
Tạo file .env với nội dung:

env
PORT=5000
NODE_ENV=development

# Firebase config
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com

# Nếu dùng GOOGLE_APPLICATION_CREDENTIALS_JSON (thay vì file)
# GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
⚠️ Lưu ý: Đừng bao giờ commit file .env hay serviceAccountKey.json lên GitHub. File .gitignore đã cấu hình sẵn.

📁 Cấu trúc thư mục
text
server/
├── controllers/       # Xử lý request/response
│   ├── authController.js
│   ├── userController.js
│   ├── stationController.js
│   ├── bookingController.js
│   ├── chargingController.js
│   └── adminController.js
├── middleware/        # Xác thực, phân quyền, validation
│   ├── auth.js
│   ├── roleCheck.js
│   └── validation.js
├── models/            # CRUD Firestore
│   ├── userModel.js
│   ├── stationModel.js
│   ├── bookingModel.js
│   └── historyModel.js
├── routes/            # Định nghĩa endpoint
│   ├── auth.js
│   ├── users.js
│   ├── stations.js
│   ├── bookings.js
│   ├── charging.js
│   └── admin.js
├── services/          # Logic nghiệp vụ phức tạp (transaction, notification)
│   ├── bookingService.js
│   └── notificationService.js
├── utils/             # Hỗ trợ: firebase, constants, helpers
│   ├── firebase.js
│   ├── constants.js
│   └── helpers.js
├── validations/       # Schema kiểm tra đầu vào (express-validator)
│   ├── authValidation.js
│   ├── userValidation.js
│   ├── stationValidation.js
│   └── bookingValidation.js
├── .env
├── .gitignore
├── package.json
├── server.js
└── README.md
🌐 API Endpoints
Base URL: http://localhost:5000/api

🔐 Auth
Method	Endpoint	Mô tả	Quyền
POST	/auth/register	Đăng ký (driver/owner)	public
POST	/auth/login	Hướng dẫn client login qua Firebase SDK	public
GET	/auth/me	Lấy thông tin user hiện tại	user
👤 User
Method	Endpoint	Mô tả	Quyền
GET	/users/profile	Xem profile	user
PUT	/users/profile	Cập nhật profile	user
POST	/users/stations/:stationId/staff	Tạo staff cho trạm	owner
GET	/users/stations/:stationId/staff	DS staff của trạm	owner
🏢 Station & Ports
Method	Endpoint	Mô tả	Quyền
GET	/stations?lat=&lng=&radius=	DS trạm (gần đúng)	public
GET	/stations/:stationId	Chi tiết trạm + ports	public
POST	/stations	Tạo trạm mới	owner/admin
PUT	/stations/:stationId	Cập nhật trạm	owner/admin
DELETE	/stations/:stationId	Xóa trạm (nếu không có booking)	owner/admin
POST	/stations/:stationId/ports	Thêm cổng sạc	owner/admin
PUT	/stations/:stationId/ports/:portId	Cập nhật cổng	owner/admin
DELETE	/stations/:stationId/ports/:portId	Xóa cổng	owner/admin
📅 Booking
Method	Endpoint	Mô tả	Quyền
POST	/bookings	Tạo booking (transaction)	driver
GET	/bookings/my-bookings	DS booking của driver	driver
GET	/bookings/station/:stationId	DS booking của trạm (có lọc status)	staff/owner
GET	/bookings/:bookingId	Chi tiết booking	driver/staff/owner
PUT	/bookings/:bookingId/cancel	Hủy booking (confirmed hoặc waiting)	driver/owner
PUT	/bookings/:bookingId/checkin	Check-in bằng GPS (cần toạ độ)	driver
PUT	/bookings/:bookingId/pay	Xác nhận thanh toán → bắt đầu sạc	staff/owner
PUT	/bookings/:bookingId/end-charging	Kết thúc sạc → giải phóng cổng	driver/staff/owner
⚡ Charging (Staff/Owner)
Method	Endpoint	Mô tả
GET	/charging/stations/:stationId/ports	DS cổng (kèm trạng thái)
PUT	/charging/stations/:stationId/ports/:portId/status	Cập nhật trạng thái cổng (maintenance/offline)
POST	/charging/stations/:stationId/checkin-assist/:bookingId	Check-in hộ cho driver
👑 Admin
Method	Endpoint	Mô tả
GET	/admin/users?role=&limit=	DS người dùng (phân trang)
GET	/admin/users/:uid	Chi tiết user
PUT	/admin/users/:uid/status	Khóa/mở khóa user
DELETE	/admin/users/:uid	Xóa user (cẩn thận)
GET	/admin/stations	Tất cả trạm
PUT	/admin/stations/:stationId/status	Duyệt/vô hiệu hóa trạm
GET	/admin/dashboard	Thống kê dashboard
🔄 Luồng nghiệp vụ chính
1. Driver đặt lịch sạc
Driver chọn trạm, cổng, giờ bắt đầu, thời lượng.

Server kiểm tra xung đột lịch, trạng thái cổng, giờ hoạt động → tạo booking confirmed (transaction).

Driver có thể hủy trước khi check-in.

2. Check-in & thanh toán
Driver đến trạm, bấm check-in (yêu cầu GPS trong vòng 50m) → chuyển sang waiting_for_payment.

Staff/owner xác nhận đã thu tiền (offline) → chuyển sang charging, cổng chuyển sang occupied.

Khi sạc xong, driver hoặc staff kết thúc sạc → chuyển sang completed, cổng trở lại available, lưu lịch sử.

3. Hỗ trợ đặc biệt
Nếu GPS không chính xác, staff có thể check-in hộ qua endpoint /charging/.../checkin-assist.

Trước khi chuyển cổng sang maintenance, hệ thống kiểm tra không có booking active.

🧪 Xử lý lỗi & Validation
Tất cả các endpoint đều có validation schema (trong thư mục validations/) sử dụng express-validator.

Lỗi validation trả về HTTP 400 kèm mảng chi tiết lỗi.

Lỗi phân quyền trả về 403.

Lỗi token hết hạn hoặc không hợp lệ trả về 401.

Sử dụng try-catch trong controller, log lỗi ra console (có thể tích hợp Winston sau).

🚀 Triển khai lên production
Sử dụng Google Cloud Run / App Engine hoặc VPS (Ubuntu)
Cài đặt PM2 (quản lý process):

bash
npm install -g pm2
pm2 start server.js --name ev-backend
pm2 save
pm2 startup
Sử dụng Nginx làm reverse proxy (tuỳ chọn).

Biến môi trường:

Đặt các biến môi trường thực tế trên server (không dùng file .env nếu deploy trên GCP, có thể dùng Secret Manager).

Không lưu service account key dưới dạng file, thay vào đó dùng biến GOOGLE_APPLICATION_CREDENTIALS_JSON (xem code mẫu trong utils/firebase.js).

Firestore Indexes:

Một số query yêu cầu composite index (ví dụ bookings trên portId + status). Nếu gặp lỗi, Firebase Console sẽ cung cấp link tạo index tự động.

🤝 Đóng góp
Mọi đóng góp (báo lỗi, cải thiện tài liệu, pull request) đều được chào đón. Vui lòng tạo issue trước khi gửi PR.

Fork repository

Tạo nhánh mới: git checkout -b feature/your-feature

Commit thay đổi: git commit -m 'Add some feature'

Push lên nhánh: git push origin feature/your-feature

Mở Pull Request

📄 Giấy phép
Dự án được phân phối dưới giấy phép MIT. Xem file LICENSE để biết thêm chi tiết.

📧 Liên hệ
Tác giả: Phan Văn Khải
Email: phankhai260504@gmail.com
GitHub: github.com/yourusername

⭐ Nếu bạn thấy dự án hữu ích, hãy cho nó một ngôi sao trên GitHub!

---

## 5. Tạo file `LICENSE` (khuyến khích)

Trong thư mục gốc `server/`, tạo file `LICENSE` (nếu dùng MIT):

```text
MIT License

Copyright (c) 2025 [Tên bạn]

Permission is hereby granted...