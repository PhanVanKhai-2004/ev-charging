// validations/common.js
const { body, param } = require('express-validator');

// Kiểm tra email hợp lệ
const isValidEmail = (field = 'email') => 
  body(field).isEmail().withMessage('Email không hợp lệ').normalizeEmail();

// Kiểm tra số điện thoại (10-11 số)
const isValidPhone = (field = 'phone') =>
  body(field).isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ (10-11 số)');

// Kiểm tra mật khẩu (tối thiểu 6 ký tự)
const isValidPassword = (field = 'password') =>
  body(field).isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự');

// Kiểm tra role hợp lệ (nếu có)
const isValidRole = (allowedRoles) =>
  body('role').optional().isIn(allowedRoles).withMessage(`Role phải là: ${allowedRoles.join(', ')}`);

// Kiểm tra ID (uid, stationId, bookingId) không bắt buộc nhưng nếu có phải là string
const isValidId = (field, paramName = 'id') =>
  param(field).optional().isString().withMessage(`${paramName} không hợp lệ`);

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidRole,
  isValidId
};