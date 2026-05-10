// models/historyModel.js
const { db } = require('../utils/firebase');
const { COLLECTIONS } = require('../utils/constants');

const COLLECTION = COLLECTIONS.CHARGING_HISTORY;

/**
 * Tạo bản ghi lịch sử sạc (chỉ dùng từ backend, không cho client gọi trực tiếp)
 */
const createHistory = async (historyData) => {
  const historyRef = db.collection(COLLECTION).doc();
  await historyRef.set({
    ...historyData,
    completedAt: new Date()
  });
  return historyRef.id;
};

/**
 * Lấy lịch sử của một user
 */
const findByUser = async (userId, limit = 20) => {
  const snapshot = await db.collection(COLLECTION)
    .where('userId', '==', userId)
    .orderBy('completedAt', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Lấy lịch sử theo trạm (cho owner/admin)
 */
const findByStation = async (stationId, limit = 50) => {
  const snapshot = await db.collection(COLLECTION)
    .where('stationId', '==', stationId)
    .orderBy('completedAt', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

module.exports = { createHistory, findByUser, findByStation };