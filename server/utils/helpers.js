// utils/helpers.js
const { db } = require('./firebase');
const { BOOKING_STATUS } = require('./constants');

/**
 * Tính khoảng cách giữa hai điểm (km) dùng công thức Haversine
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Kiểm tra xung đột lịch trên một port (hỗ trợ transaction)
 * @param {Transaction} transaction - Có thể null nếu không dùng transaction
 */
async function checkBookingConflict(transaction, portId, startTime, durationHours, excludeBookingId = null) {
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
  const activeStatuses = [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.WAITING_PAYMENT, BOOKING_STATUS.PAID, BOOKING_STATUS.CHARGING];
  
  let query = db.collection('bookings').where('portId', '==', portId);
  let snapshot;
  if (transaction) {
    snapshot = await transaction.get(query);
  } else {
    snapshot = await query.get();
  }
  
  for (const doc of snapshot.docs) {
    if (excludeBookingId && doc.id === excludeBookingId) continue;
    const data = doc.data();
    if (!transaction && !activeStatuses.includes(data.status)) continue;
    if (transaction && !activeStatuses.includes(data.status)) continue;
    
    const existingStart = data.estimatedStartTime.toDate ? data.estimatedStartTime.toDate() : new Date(data.estimatedStartTime);
    const existingEnd = new Date(existingStart.getTime() + (data.estimatedDuration || 0) * 60 * 60 * 1000);
    if (startTime < existingEnd && endTime > existingStart) return true;
  }
  return false;
}

/**
 * Tạo mật khẩu tạm thời
 */
function generateTempPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

module.exports = { getDistance, checkBookingConflict, generateTempPassword };