// controllers/adminController.js
const { db, admin } = require('../utils/firebase');
const userModel = require('../models/userModel');
const stationModel = require('../models/stationModel');
const { ROLES, BOOKING_STATUS } = require('../utils/constants');

/**
 * Lấy danh sách người dùng (có phân trang và lọc theo role)
 * GET /api/admin/users?role=driver&limit=20&startAfter=uid
 */
const getUsers = async (req, res) => {
  const { role, limit = 20, startAfter } = req.query;
  try {
    let query = db.collection('users').orderBy('createdAt', 'desc').limit(parseInt(limit));
    if (role && Object.values(ROLES).includes(role)) {
      query = db.collection('users').where('role', '==', role).orderBy('createdAt', 'desc').limit(parseInt(limit));
    }
    if (startAfter) {
      const startDoc = await db.collection('users').doc(startAfter).get();
      query = query.startAfter(startDoc);
    }
    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy chi tiết một người dùng (theo uid)
 * GET /api/admin/users/:uid
 */
const getUserDetail = async (req, res) => {
  const { uid } = req.params;
  try {
    const user = await userModel.findById(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cập nhật trạng thái người dùng (khóa/mở khóa)
 * PUT /api/admin/users/:uid/status
 * Body: { status: "active" | "banned" }
 */
const updateUserStatus = async (req, res) => {
  const { uid } = req.params;
  const { status } = req.body;
  if (!['active', 'banned'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be active or banned' });
  }
  try {
    await userModel.update(uid, { status, updatedAt: new Date() });
    res.json({ message: `User ${status === 'active' ? 'unbanned' : 'banned'} successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Xóa người dùng (cẩn thận, chỉ nên dùng khi cần)
 * DELETE /api/admin/users/:uid
 */
const deleteUser = async (req, res) => {
  const { uid } = req.params;
  // Không cho xóa chính mình
  if (uid === req.user.uid) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    // Xóa trong Firebase Auth
    const { auth } = require('../utils/firebase');
    await auth.deleteUser(uid);
    // Xóa trong Firestore
    await userModel.deleteUser(uid);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ======================= QUẢN LÝ TRẠM (ADMIN) =======================

/**
 * Lấy danh sách tất cả trạm (admin)
 * GET /api/admin/stations?status=active&limit=20
 */
const getAllStations = async (req, res) => {
  const { status, limit = 50 } = req.query;
  try {
    let query = db.collection('chargingStations').orderBy('createdAt', 'desc').limit(parseInt(limit));
    if (status) {
      query = db.collection('chargingStations').where('status', '==', status).limit(parseInt(limit));
    }
    const snapshot = await query.get();
    const stations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(stations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Phê duyệt hoặc vô hiệu hóa trạm (admin)
 * PUT /api/admin/stations/:stationId/status
 * Body: { status: "active" | "maintenance" | "pending_approval" }
 */
const updateStationStatus = async (req, res) => {
  const { stationId } = req.params;
  const { status } = req.body;
  const validStatuses = ['active', 'maintenance', 'pending_approval'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    await stationModel.update(stationId, { status, updatedAt: new Date() });
    res.json({ message: 'Station status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ======================= DASHBOARD THỐNG KÊ =======================

/**
 * Lấy số liệu thống kê tổng quan cho dashboard
 * GET /api/admin/dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    // Đếm số lượng user theo role
    const userCounts = {
      total: 0,
      driver: 0,
      station_owner: 0,
      staff: 0,
      admin: 0
    };
    const userSnapshot = await db.collection('users').get();
    userSnapshot.forEach(doc => {
      const role = doc.data().role;
      userCounts.total++;
      if (userCounts.hasOwnProperty(role)) userCounts[role]++;
    });

    // Đếm số trạm
    const stationSnapshot = await db.collection('chargingStations').get();
    const totalStations = stationSnapshot.size;

    // Đếm số cổng (ports) – có thể lấy từ mỗi trạm, hoặc tạo một aggregation
    let totalPorts = 0;
    for (const stationDoc of stationSnapshot.docs) {
      const portsSnap = await db.collection(`chargingStations/${stationDoc.id}/ports`).get();
      totalPorts += portsSnap.size;
    }

    // Thống kê booking hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const bookingsTodaySnapshot = await db.collection('bookings')
      .where('createdAt', '>=', today)
      .where('createdAt', '<', tomorrow)
      .get();
    const bookingsToday = bookingsTodaySnapshot.size;

    // Doanh thu hôm nay (từ chargingHistory, nếu có)
    let revenueToday = 0;
    const historyTodaySnapshot = await db.collection('chargingHistory')
      .where('completedAt', '>=', today)
      .where('completedAt', '<', tomorrow)
      .get();
    historyTodaySnapshot.forEach(doc => {
      revenueToday += doc.data().finalTotalAmount || 0;
    });

    // Tỷ lệ sử dụng trung bình (số booking đang charging / tổng số cổng)
    const activeBookingsSnapshot = await db.collection('bookings')
      .where('status', '==', BOOKING_STATUS.CHARGING)
      .get();
    const activeCharging = activeBookingsSnapshot.size;
    const utilizationRate = totalPorts > 0 ? (activeCharging / totalPorts) * 100 : 0;

    res.json({
      users: userCounts,
      stations: {
        total: totalStations,
        totalPorts,
        activeCharging,
        utilizationRate: utilizationRate.toFixed(2) + '%'
      },
      bookings: {
        today: bookingsToday,
        revenueToday: revenueToday.toLocaleString('vi-VN') + ' VND'
      },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserDetail,
  updateUserStatus,
  deleteUser,
  getAllStations,
  updateStationStatus,
  getDashboardStats
};