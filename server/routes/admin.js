// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { ROLES } = require('../utils/constants');

// Tất cả route admin đều yêu cầu xác thực và role admin
router.use(verifyToken, requireRole([ROLES.ADMIN]));

// Quản lý người dùng
router.get('/users', adminController.getUsers);
router.get('/users/:uid', adminController.getUserDetail);
router.put('/users/:uid/status', adminController.updateUserStatus);
router.delete('/users/:uid', adminController.deleteUser);

// Quản lý trạm
router.get('/stations', adminController.getAllStations);
router.put('/stations/:stationId/status', adminController.updateStationStatus);

// Dashboard thống kê
router.get('/dashboard', adminController.getDashboardStats);

module.exports = router;