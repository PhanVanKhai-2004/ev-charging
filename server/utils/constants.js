// utils/constants.js
// Tất cả hằng số dùng chung cho toàn bộ hệ thống

module.exports = {
  // Các vai trò người dùng
  ROLES: {
    DRIVER: 'driver',
    STATION_OWNER: 'station_owner',
    STAFF: 'staff',
    ADMIN: 'admin'
  },

  // Trạng thái của booking (theo đúng luồng thiết kế)
  BOOKING_STATUS: {
    CONFIRMED: 'confirmed',
    WAITING_PAYMENT: 'waiting_for_payment',
    PAID: 'paid',
    CHARGING: 'charging',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },

  // Trạng thái của cổng sạc (port)
  PORT_STATUS: {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    MAINTENANCE: 'maintenance',
    OFFLINE: 'offline'
  },

  // Các thông số cấu hình (có thể điều chỉnh sau)
  CONFIG: {
    CHECKIN_RADIUS_METERS: 50,          // bán kính cho phép check-in (mét)
    GRACE_PERIOD_MINUTES: 15,           // thời gian gia hạn nếu không check-in (phút)
    CHARGE_END_BUFFER_MINUTES: 7,       // buffer sau khi hết giờ sạc (phút)
    MAX_SEARCH_RADIUS_KM: 10            // bán kính tìm kiếm trạm mặc định (km)
  },

  // Tên các collection trong Firestore (viết hoa để dễ nhận biết)
  COLLECTIONS: {
    USERS: 'users',
    CHARGING_STATIONS: 'chargingStations',
    BOOKINGS: 'bookings',
    CHARGING_HISTORY: 'chargingHistory'
  }
};