// routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const { requireStationOwner } = require('../middleware/roleCheck');

// Profile (yêu cầu token)
router.get('/profile', verifyToken, userController.getProfile);
router.put('/profile', verifyToken, userController.updateProfile);

// Staff management (chỉ station owner của trạm mới được)
router.post('/stations/:stationId/staff', verifyToken, requireStationOwner, userController.createStaff);
router.get('/stations/:stationId/staff', verifyToken, requireStationOwner, userController.getStaffList);

module.exports = router;