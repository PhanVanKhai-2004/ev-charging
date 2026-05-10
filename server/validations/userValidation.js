// validations/userValidation.js
const { body, param } = require("express-validator");
const { isValidPhone } = require("./common");

// Cập nhật profile
const validateUpdateProfile = [
  body("fullName").optional().notEmpty().withMessage("Họ tên không được rỗng"),
  isValidPhone("phone").optional(),
  body("avatarURL").optional().isURL().withMessage("Avatar phải là URL hợp lệ"),
];

// Tạo staff (bởi owner)
const validateCreateStaff = [
  body("fullName").notEmpty().withMessage("Họ tên không được để trống"),
  body("email").isEmail().withMessage("Email không hợp lệ"),
  isValidPhone("phone"),
];

// Lấy danh sách staff theo stationId
const validateGetStaffList = [
  param("stationId")
    .isString()
    .notEmpty()
    .withMessage("stationId không hợp lệ"),
];

module.exports = {
  validateUpdateProfile,
  validateCreateStaff,
  validateGetStaffList,
};
