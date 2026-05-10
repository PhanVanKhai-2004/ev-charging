// validations/bookingValidation.js
const { body, param, query } = require('express-validator');

// Tạo booking
const validateCreateBooking = [
  body('stationId').isString().notEmpty(),
  body('portId').isString().notEmpty(),
  body('estimatedStartTime').isISO8601().withMessage('Thời gian bắt đầu không đúng định dạng ISO 8601'),
  body('estimatedDuration').isInt({ min: 0.5, max: 24 }).withMessage('Thời lượng sạc phải từ 0.5 đến 24 giờ'),
  body('selectedServices').optional().isArray()
];

// Check-in
const validateCheckin = [
  param('bookingId').isString().notEmpty(),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Vĩ độ không hợp lệ'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Kinh độ không hợp lệ')
];

// Hủy booking
const validateCancel = [
  param('bookingId').isString().notEmpty()
];

// Thanh toán (pay)
const validatePay = [
  param('bookingId').isString().notEmpty()
];

// Kết thúc sạc
const validateEndCharging = [
  param('bookingId').isString().notEmpty()
];

// Lấy booking theo station (query status optional)
const validateStationBookings = [
  param('stationId').isString().notEmpty(),
  query('status').optional().isString()
];

module.exports = {
  validateCreateBooking,
  validateCheckin,
  validateCancel,
  validatePay,
  validateEndCharging,
  validateStationBookings
};