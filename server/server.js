// server.js
require("dotenv").config(); // Nạp biến môi trường từ file .env

const express = require("express");
const cors = require("cors");

// Khởi tạo Firebase (đảm bảo đã có)
require("./utils/firebase"); // chỉ để khởi tạo, không cần gán

const { verifyToken } = require("./middleware/auth");
const {
  requireRole,
  requireStationOwner,
  requireStaffOrOwner,
} = require("./middleware/roleCheck");

// Import các route
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const bookingRoutes = require("./routes/bookings");
const chargingRoutes = require("./routes/charging");
const stationRoutes = require("./routes/stations");
const adminRoutes = require("./routes/admin");
// Các route khác có thể thêm sau: stations, bookings, charging, admin

const app = express();

// Middleware toàn cục
app.use(cors()); // Cho phép gọi từ mọi nguồn (frontend React Native)
app.use(express.json()); // Parse JSON body

// Route kiểm tra sức khỏe
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// Đăng ký các route chính
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
// app.use('/api/stations', stationRoutes); // sẽ thêm ở bước sau
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/charging', chargingRoutes);
// app.use('/api/admin', adminRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/charging", chargingRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/admin", adminRoutes);
// Xử lý lỗi 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Lắng nghe cổng
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
