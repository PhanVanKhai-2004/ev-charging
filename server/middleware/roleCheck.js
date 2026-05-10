// middleware/roleCheck.js
const { db } = require('../utils/firebase');
const { ROLES, COLLECTIONS } = require('../utils/constants');

/**
 * Kiểm tra người dùng có một trong các role cho phép hay không.
 * @param {string[]} allowedRoles - Mảng các role được phép (vd: [ROLES.ADMIN, ROLES.STATION_OWNER])
 */
const requireRole = (allowedRoles) => (req, res, next) => {
  if (!req.userData || !allowedRoles.includes(req.userData.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  }
  next();
};

/**
 * Kiểm tra user là chủ sở hữu của trạm (station owner) hoặc admin.
 * Phải có tham số stationId trong req.params.
 */
const requireStationOwner = async (req, res, next) => {
  const { stationId } = req.params;
  if (!stationId) {
    return res.status(400).json({ error: 'Missing stationId in URL parameters' });
  }
  const user = req.userData;
  // Admin được toàn quyền
  if (user.role === ROLES.ADMIN) return next();
  // Chỉ station_owner mới có thể sở hữu trạm
  if (user.role !== ROLES.STATION_OWNER) {
    return res.status(403).json({ error: 'Only station owner can perform this action' });
  }
  // Lấy thông tin trạm và kiểm tra ownerId
  const stationRef = db.collection(COLLECTIONS.CHARGING_STATIONS || 'chargingStations').doc(stationId);
  const stationDoc = await stationRef.get();
  if (!stationDoc.exists || stationDoc.data().ownerId !== req.user.uid) {
    return res.status(403).json({ error: 'You do not own this station' });
  }
  next();
};

/**
 * Kiểm tra user là staff của trạm, hoặc chủ trạm, hoặc admin.
 * Phải có tham số stationId trong req.params.
 */
const requireStaffOrOwner = async (req, res, next) => {
  const { stationId } = req.params;
  if (!stationId) {
    return res.status(400).json({ error: 'Missing stationId in URL parameters' });
  }
  const user = req.userData;
  // Admin -> cho qua
  if (user.role === ROLES.ADMIN) return next();
  // Station owner -> kiểm tra sở hữu trạm
  if (user.role === ROLES.STATION_OWNER) {
    const stationRef = db.collection(COLLECTIONS.CHARGING_STATIONS || 'chargingStations').doc(stationId);
    const stationDoc = await stationRef.get();
    if (stationDoc.exists && stationDoc.data().ownerId === req.user.uid) {
      return next();
    }
    return res.status(403).json({ error: 'You do not own this station' });
  }
  // Staff -> kiểm tra stationId trong userData có khớp không
  if (user.role === ROLES.STAFF && user.stationId === stationId) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: not authorized for this station' });
};

module.exports = { requireRole, requireStationOwner, requireStaffOrOwner };