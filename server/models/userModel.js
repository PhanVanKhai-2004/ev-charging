// models/userModel.js
const { db } = require('../utils/firebase');
const { COLLECTIONS } = require('../utils/constants');

const COLLECTION = COLLECTIONS.USERS;

/**
 * Tìm user theo uid
 * @param {string} uid 
 * @returns {Promise<{uid: string, ...userData} | null>}
 */
const findById = async (uid) => {
  const doc = await db.collection(COLLECTION).doc(uid).get();
  if (!doc.exists) return null;
  return { uid: doc.id, ...doc.data() };
};

/**
 * Tạo mới user
 * @param {string} uid 
 * @param {Object} userData 
 */
const create = async (uid, userData) => {
  await db.collection(COLLECTION).doc(uid).set(userData);
};

/**
 * Cập nhật user
 * @param {string} uid 
 * @param {Object} updates 
 */
const update = async (uid, updates) => {
  await db.collection(COLLECTION).doc(uid).update(updates);
};

/**
 * Xóa user (cân nhắc: có thể chỉ đánh dấu status='banned' thay vì xóa)
 */
const deleteUser = async (uid) => {
  await db.collection(COLLECTION).doc(uid).delete();
};

/**
 * Lấy danh sách user theo role và phân trang
 */
const findByRole = async (role, limit = 50, startAfter = null) => {
  let query = db.collection(COLLECTION).where('role', '==', role).limit(limit);
  if (startAfter) {
    const startDoc = await db.collection(COLLECTION).doc(startAfter).get();
    query = query.startAfter(startDoc);
  }
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
};

module.exports = { findById, create, update, deleteUser, findByRole };