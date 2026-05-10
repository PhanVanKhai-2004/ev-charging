// controllers/authController.js
const { auth, admin } = require('../utils/firebase');
const userModel = require('../models/userModel');
const { ROLES } = require('../utils/constants');

// Helper validation
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone) => /^[0-9]{10,11}$/.test(phone);
const validatePassword = (password) => password && password.length >= 6;

/**
 * Đăng ký tài khoản (chỉ driver hoặc station_owner)
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const { fullName, email, phone, password, role } = req.body;

  // 1. Kiểm tra thiếu trường
  if (!fullName || !email || !phone || !password || !role) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  }

  // 2. Validation chi tiết
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Email không hợp lệ' });
  }
  if (!validatePhone(phone)) {
    return res.status(400).json({ error: 'Số điện thoại không hợp lệ (10-11 số)' });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
  }
  if (![ROLES.DRIVER, ROLES.STATION_OWNER].includes(role)) {
    return res.status(400).json({ error: 'Vai trò không hợp lệ. Chỉ driver hoặc station_owner mới được đăng ký.' });
  }

  try {
    // 3. Tạo user trên Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
    });

    // 4. Chuẩn bị dữ liệu Firestore
    const userData = {
      fullName,
      email,
      phone,
      role,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
    };
    if (role === ROLES.STATION_OWNER) {
      userData.stationIds = [];
    }

    // 5. Lưu vào Firestore qua model
    await userModel.create(userRecord.uid, userData);

    // 6. Trả về thành công
    res.status(201).json({
      uid: userRecord.uid,
      fullName,
      email,
      phone,
      role,
      message: 'Đăng ký thành công. Vui lòng đăng nhập.',
    });
  } catch (error) {
    // Xử lý lỗi Firebase cụ thể
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email đã được sử dụng' });
    }
    if (error.code === 'auth/invalid-password') {
      return res.status(400).json({ error: 'Mật khẩu yếu (phải ít nhất 6 ký tự)' });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Đăng nhập - hướng dẫn client dùng Firebase SDK
 * POST /api/auth/login
 */
const login = async (req, res) => {
  res.status(200).json({
    message: 'Vui lòng sử dụng Firebase Authentication SDK để đăng nhập từ client. Sau đó gửi token đến /api/auth/me',
  });
};

/**
 * Lấy thông tin user hiện tại (cần token)
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    // req.userData đã được middleware verifyToken gắn sau khi lấy từ Firestore
    const { uid } = req.user;
    const userData = req.userData;
    if (!userData) {
      return res.status(404).json({ error: 'User data not found' });
    }
    res.json({ uid, ...userData });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { register, login, getMe };