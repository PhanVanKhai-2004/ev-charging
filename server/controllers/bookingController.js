// controllers/bookingController.js
const bookingService = require('../services/bookingService');
const { db } = require('../utils/firebase');
const { ROLES } = require('../utils/constants');

// Tạo booking (driver)
const create = async (req, res) => {
  const { stationId, portId, estimatedStartTime, estimatedDuration, selectedServices } = req.body;
  const userId = req.user.uid;
  if (!stationId || !portId || !estimatedStartTime || !estimatedDuration) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const result = await bookingService.createBooking({
    userId,
    stationId,
    portId,
    estimatedStartTime,
    estimatedDuration,
    selectedServices: selectedServices || []
  });
  if (result.success) {
    res.status(201).json({ bookingId: result.bookingId });
  } else {
    res.status(400).json({ error: result.error });
  }
};

// Lấy danh sách booking của driver hiện tại
const getMyBookings = async (req, res) => {
  const userId = req.user.uid;
  const { status } = req.query;
  let query = db.collection('bookings').where('userId', '==', userId);
  if (status) query = query.where('status', '==', status);
  query = query.orderBy('estimatedStartTime', 'desc');
  const snapshot = await query.get();
  const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(bookings);
};

// Lấy booking của một trạm (cho staff/owner)
const getStationBookings = async (req, res) => {
  const { stationId } = req.params;
  const { status } = req.query;
  let query = db.collection('bookings').where('stationId', '==', stationId);
  if (status) query = query.where('status', '==', status);
  query = query.orderBy('estimatedStartTime', 'asc');
  const snapshot = await query.get();
  const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(bookings);
};

// Chi tiết booking
const getBookingById = async (req, res) => {
  const { bookingId } = req.params;
  const doc = await db.collection('bookings').doc(bookingId).get();
  if (!doc.exists) return res.status(404).json({ error: 'Booking not found' });
  const booking = { id: doc.id, ...doc.data() };
  // Kiểm tra quyền: driver của booking, staff/owner của trạm, hoặc admin
  const user = req.userData;
  const isDriver = booking.userId === req.user.uid;
  const isStaffOrOwner = (user.role === ROLES.STAFF && user.stationId === booking.stationId) ||
                          (user.role === ROLES.STATION_OWNER) ||
                          (user.role === ROLES.ADMIN);
  if (!isDriver && !isStaffOrOwner) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(booking);
};

// Hủy booking
const cancel = async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.uid;
  const result = await bookingService.cancelBooking(bookingId, userId);
  if (result.success) {
    res.json({ message: 'Booking cancelled' });
  } else {
    res.status(400).json({ error: result.error });
  }
};

// Driver check-in
const checkin = async (req, res) => {
  const { bookingId } = req.params;
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'Missing location' });
  // Lấy thông tin trạm để có tọa độ
  const bookingDoc = await db.collection('bookings').doc(bookingId).get();
  if (!bookingDoc.exists) return res.status(404).json({ error: 'Booking not found' });
  const booking = bookingDoc.data();
  if (booking.userId !== req.user.uid) return res.status(403).json({ error: 'Not your booking' });
  const stationDoc = await db.collection('chargingStations').doc(booking.stationId).get();
  if (!stationDoc.exists) return res.status(404).json({ error: 'Station not found' });
  const station = stationDoc.data();
  const { location } = station; // GeoPoint
  const result = await bookingService.checkinBooking(
    bookingId, req.user.uid, lat, lng, location.latitude, location.longitude
  );
  if (result.success) {
    res.json({ message: 'Check-in successful. Please wait for payment confirmation.' });
  } else {
    res.status(400).json({ error: result.error });
  }
};

// Staff/Owner xác nhận thanh toán
const pay = async (req, res) => {
  const { bookingId } = req.params;
  const staffId = req.user.uid;
  const result = await bookingService.confirmPayment(bookingId, staffId);
  if (result.success) {
    res.json({ message: 'Payment confirmed. Charging started.' });
  } else {
    res.status(400).json({ error: result.error });
  }
};

// Kết thúc sạc
const endCharging = async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.uid;
  const role = req.userData.role;
  const result = await bookingService.endCharging(bookingId, userId, role);
  if (result.success) {
    res.json({ message: 'Charging ended.' });
  } else {
    res.status(400).json({ error: result.error });
  }
};

module.exports = { create, getMyBookings, getStationBookings, getBookingById, cancel, checkin, pay, endCharging };