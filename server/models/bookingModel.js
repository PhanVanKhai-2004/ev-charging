// models/bookingModel.js
const { db } = require('../utils/firebase');
const { COLLECTIONS, BOOKING_STATUS } = require('../utils/constants');

const COLLECTION = COLLECTIONS.BOOKINGS;

/**
 * Tạo booking mới (trả về bookingId)
 */
const create = async (bookingData) => {
  const bookingRef = db.collection(COLLECTION).doc();
  await bookingRef.set({
    ...bookingData,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return bookingRef.id;
};

/**
 * Tìm booking theo ID
 */
const findById = async (bookingId) => {
  const doc = await db.collection(COLLECTION).doc(bookingId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

/**
 * Cập nhật booking (chung chung)
 */
const update = async (bookingId, updates) => {
  await db.collection(COLLECTION).doc(bookingId).update({
    ...updates,
    updatedAt: new Date()
  });
};

/**
 * Cập nhật trạng thái booking (tiện ích)
 */
const updateStatus = async (bookingId, status, additionalData = {}) => {
  await db.collection(COLLECTION).doc(bookingId).update({
    status,
    ...additionalData,
    updatedAt: new Date()
  });
};

/**
 * Lấy các booking của một user (driver)
 */
const findByUser = async (userId, statusFilter = null, limit = 20) => {
  let query = db.collection(COLLECTION).where('userId', '==', userId);
  if (statusFilter) {
    query = query.where('status', '==', statusFilter);
  }
  query = query.orderBy('estimatedStartTime', 'desc').limit(limit);
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Lấy booking của một trạm (cho staff/owner), có thể lọc theo status
 */
const findByStation = async (stationId, status = null, limit = 50) => {
  let query = db.collection(COLLECTION).where('stationId', '==', stationId);
  if (status) {
    query = query.where('status', '==', status);
  }
  query = query.orderBy('estimatedStartTime', 'asc').limit(limit);
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * (Dùng trong transaction) lấy booking xung đột – sẽ gọi trực tiếp trong service
 */

module.exports = {
  create,
  findById,
  update,
  updateStatus,
  findByUser,
  findByStation
};