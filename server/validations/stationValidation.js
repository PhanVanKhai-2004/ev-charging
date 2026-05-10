// validations/stationValidation.js
const { body, param } = require("express-validator");

// Tạo trạm
const validateCreateStation = [
  body("name").notEmpty().withMessage("Tên trạm không được để trống"),
  body("address").notEmpty().withMessage("Địa chỉ không được để trống"),
  body("location").custom((value) => {
    if (!value || typeof value !== "object")
      throw new Error("Location phải là object {lat, lng}");
    if (typeof value.lat !== "number" || typeof value.lng !== "number")
      throw new Error("lat, lng phải là số");
    return true;
  }),
  body("pricePerHour")
    .isNumeric()
    .withMessage("Giá mỗi giờ phải là số")
    .toFloat(),
  body("operatingHours").optional().isObject(),
  body("additionalServices").optional().isArray(),
  body("images").optional().isArray(),
];

// Cập nhật trạm (các trường tuỳ chọn)
const validateUpdateStation = [
  param("stationId").isString().notEmpty(),
  body("name").optional().notEmpty(),
  body("address").optional().notEmpty(),
  body("pricePerHour").optional().isNumeric().toFloat(),
];

// Port
const validateCreatePort = [
  param("stationId").isString().notEmpty(),
  body("portNumber").notEmpty().withMessage("Số hiệu cổng không được để trống"),
  body("powerKW").isNumeric().withMessage("Công suất phải là số").toFloat(),
  body("connectorType").optional().isString(),
  body("status").optional().isIn(["available", "maintenance", "offline"]),
];

const validateUpdatePort = [
  param("stationId").isString().notEmpty(),
  param("portId").isString().notEmpty(),
  body("portNumber").optional(),
  body("powerKW").optional().isNumeric(),
  body("status")
    .optional()
    .isIn(["available", "maintenance", "offline", "occupied"]),
];

module.exports = {
  validateCreateStation,
  validateUpdateStation,
  validateCreatePort,
  validateUpdatePort,
};
