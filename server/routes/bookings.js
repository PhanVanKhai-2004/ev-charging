// routes/bookings.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken } = require('../middleware/auth');
const { requireStaffOrOwner } = require('../middleware/roleCheck');

// Tất cả đều cần xác thực
router.use(verifyToken);

// Driver
router.post('/', bookingController.create);
router.get('/my-bookings', bookingController.getMyBookings);
router.put('/:bookingId/cancel', bookingController.cancel);
router.put('/:bookingId/checkin', bookingController.checkin);

// Staff/Owner (có tham số stationId)
router.get('/station/:stationId', requireStaffOrOwner, bookingController.getStationBookings);
router.put('/:bookingId/pay', bookingController.pay); // sẽ kiểm tra quyền trong controller
router.put('/:bookingId/end-charging', bookingController.endCharging); // kiểm tra quyền trong controller

// Chi tiết (kiểm tra quyền trong controller)
router.get('/:bookingId', bookingController.getBookingById);

module.exports = router;