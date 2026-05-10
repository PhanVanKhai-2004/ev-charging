// models/stationModel.js
const { db } = require('../utils/firebase');
const { COLLECTIONS } = require('../utils/constants');

const COLLECTION = COLLECTIONS.CHARGING_STATIONS;

/**
 * Lấy trạm theo stationId
 */
const findById = async (stationId) => {
  const doc = await db.collection(COLLECTION).doc(stationId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

/**
 * Tạo trạm mới
 */
const create = async (stationId, stationData) => {
  await db.collection(COLLECTION).doc(stationId).set(stationData);
};

/**
 * Cập nhật trạm
 */
const update = async (stationId, updates) => {
  await db.collection(COLLECTION).doc(stationId).update(updates);
};

/**
 * Xóa trạm (chỉ khi không có booking active, nhưng kiểm tra nên để controller)
 */
const deleteStation = async (stationId) => {
  await db.collection(COLLECTION).doc(stationId).delete();
};

/**
 * Lấy danh sách trạm gần đúng không dùng geo query, tạm thời lấy tất cả
 * (Sau này có thể dùng Geohash hoặc Firebase Extensions)
 */
const findAll = async (limit = 50) => {
  const snapshot = await db.collection(COLLECTION).limit(limit).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ------------------ Subcollection ports ------------------
const portsCollection = (stationId) => db.collection(`${COLLECTION}/${stationId}/ports`);

/**
 * Lấy tất cả ports của một trạm
 */
const getPorts = async (stationId) => {
  const snapshot = await portsCollection(stationId).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Lấy một port cụ thể
 */
const getPort = async (stationId, portId) => {
  const doc = await portsCollection(stationId).doc(portId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

/**
 * Tạo port mới
 */
const createPort = async (stationId, portId, portData) => {
  await portsCollection(stationId).doc(portId).set(portData);
};

/**
 * Cập nhật port (chỉ data, không kiểm tra business logic - để controller xử lý)
 */
const updatePort = async (stationId, portId, updates) => {
  await portsCollection(stationId).doc(portId).update(updates);
};

/**
 * Xóa port (không kiểm tra ràng buộc)
 */
const deletePort = async (stationId, portId) => {
  await portsCollection(stationId).doc(portId).delete();
};

module.exports = {
  findById,
  create,
  update,
  deleteStation,
  findAll,
  getPorts,
  getPort,
  createPort,
  updatePort,
  deletePort
};