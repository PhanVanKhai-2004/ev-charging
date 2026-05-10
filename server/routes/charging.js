// routes/charging.js
const express = require('express');
const router = express.Router();
const chargingController = require('../controllers/chargingController');
const { verifyToken } = require('../middleware/auth');
const { requireStaffOrOwner } = require('../middleware/roleCheck');

// Tất cả đều yêu cầu xác thực và quyền staff/owner của trạm
router.use(verifyToken);
router.use(requireStaffOrOwner); // áp dụng cho tất cả route trong file này (cần stationId)

// Lấy danh sách ports (cho màn hình quản lý)
router.get('/stations/:stationId/ports', chargingController.getPorts);

// Cập nhật trạng thái port
router.put('/stations/:stationId/ports/:portId/status', chargingController.updatePortStatus);

// Check-in hộ
router.post('/stations/:stationId/checkin-assist/:bookingId', chargingController.assistCheckin);

module.exports = router;