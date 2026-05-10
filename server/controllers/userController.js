// controllers/userController.js
const { auth, admin } = require('../utils/firebase');
const userModel = require('../models/userModel');
const { ROLES } = require('../utils/constants');
const { generateTempPassword } = require('../utils/helpers');

/**
 * Lấy thông tin profile của chính user (dùng token)
 * GET /api/users/profile
 */
const getProfile = async (req, res) => {
  try {
    const userData = req.userData; // từ middleware verifyToken
    res.json({ uid: req.user.uid, ...userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cập nhật thông tin profile (fullName, phone, avatarURL)
 * PUT /api/users/profile
 */
const updateProfile = async (req, res) => {
  const { fullName, phone, avatarURL } = req.body;
  const uid = req.user.uid;

  try {
    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (phone) updates.phone = phone;
    if (avatarURL) updates.avatarURL = avatarURL;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await userModel.update(uid, updates);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Station Owner: Tạo tài khoản staff cho trạm của mình
 * POST /api/users/stations/:stationId/staff
 * Body: { fullName, email, phone }
 */
const createStaff = async (req, res) => {
  const { stationId } = req.params;
  const { fullName, email, phone } = req.body;
  const ownerId = req.user.uid;

  if (!fullName || !email || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Kiểm tra xem trạm có thuộc sở hữu của owner không đã được middleware đảm bảo (requireStationOwner)
    // Tạo mật khẩu tạm thời
    const tempPassword = generateTempPassword(); // cần import

    // Tạo user trên Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password: tempPassword,
      displayName: fullName,
    });

    // Lưu vào Firestore với role staff
    const staffData = {
      fullName,
      email,
      phone,
      role: ROLES.STAFF,
      status: 'active',
      stationId,          // gán staff vào trạm này
      ownerId,            // ai đã tạo
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
    };
    await userModel.create(userRecord.uid, staffData);

    // (Tuỳ chọn) Gửi email/SMS thông báo mật khẩu tạm – có thể bỏ qua trong đồ án
    res.status(201).json({
      uid: userRecord.uid,
      fullName,
      email,
      phone,
      role: ROLES.STAFF,
      stationId,
      tempPassword, // Trả về mật khẩu tạm để owner thông báo cho staff
      message: 'Staff account created. Please share the temporary password with staff.',
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Station Owner: Lấy danh sách staff của trạm
 * GET /api/users/stations/:stationId/staff
 */
const getStaffList = async (req, res) => {
  const { stationId } = req.params;
  try {
    // Lấy tất cả user có role = staff và stationId = stationId
    // userModel chưa có sẵn hàm này, ta tự viết truy vấn
    const { db } = require('../utils/firebase');
    const snapshot = await db.collection('users')
      .where('role', '==', ROLES.STAFF)
      .where('stationId', '==', stationId)
      .get();
    const staffList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    res.json(staffList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getProfile, updateProfile, createStaff, getStaffList };