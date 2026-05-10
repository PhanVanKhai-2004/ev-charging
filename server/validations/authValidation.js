// validations/authValidation.js
const { body } = require("express-validator");
const {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidRole,
} = require("./common");
const { ROLES } = require("../utils/constants");

// Đăng ký
const validateRegister = [
  body("fullName").notEmpty().withMessage("Họ tên không được để trống"),
  isValidEmail("email"),
  isValidPhone("phone"),
  isValidPassword("password"),
  isValidRole([ROLES.DRIVER, ROLES.STATION_OWNER]),
];

// Đăng nhập (chỉ kiểm tra có email/password, nhưng thực tế client xử lý)
const validateLogin = [
  body("email").optional().isEmail(),
  body("password").optional().isLength({ min: 6 }),
];

module.exports = {
  validateRegister,
  validateLogin,
};
