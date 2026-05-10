// controllers/chargingController.js
const { db } = require('../utils/firebase');
const { PORT_STATUS, BOOKING_STATUS } = require('../utils/constants');
const { getDistance } = require('../utils/helpers');

/**
 * Cập nhật trạng thái cổng sạc (maintenance, offline, available)
 * PUT /api/charging/stations/:stationId/ports/:portId/status
 * Body: { status: "maintenance" | "offline" | "available" }
 * Chỉ staff/owner của trạm mới được phép
 */
const updatePortStatus = async (req, res) => {
  const { stationId, portId } = req.params;
  const { status } = req.body;

  if (!status || !Object.values(PORT_STATUS).includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Allowed: available, occupied, maintenance, offline' });
  }

  // Không cho phép chuyển thành occupied qua API này (chỉ qua confirmPayment)
  if (status === PORT_STATUS.OCCUPIED) {
    return res.status(400).json({ error: 'Cannot set occupied status manually' });
  }

  try {
    const portRef = db.collection(`chargingStations/${stationId}/ports`).doc(portId);
    const portDoc = await portRef.get();
    if (!portDoc.exists) {
      return res.status(404).json({ error: 'Port not found' });
    }

    // Nếu chuyển sang maintenance hoặc offline, cần kiểm tra không có booking active
    if (status === PORT_STATUS.MAINTENANCE || status === PORT_STATUS.OFFLINE) {
      const activeBookings = await db.collection('bookings')
        .where('portId', '==', portId)
        .where('status', 'in', [
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.WAITING_PAYMENT,
          BOOKING_STATUS.PAID,
          BOOKING_STATUS.CHARGING
        ])
        .limit(1)
        .get();
      if (!activeBookings.empty) {
        return res.status(409).json({ error: 'Cannot change status because port has active bookings' });
      }
    }

    await portRef.update({
      status,
      lastUpdated: new Date()
    });

    res.json({ message: `Port status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Staff/Owner check-in hộ cho driver (khi driver gặp lỗi GPS)
 * POST /api/charging/stations/:stationId/checkin-assist/:bookingId
 * Body: không cần (sẽ lấy thông tin từ booking)
 */
const assistCheckin = async (req, res) => {
  const { stationId, bookingId } = req.params;
  const user = req.userData; // từ middleware

  try {
    // Kiểm tra booking tồn tại và thuộc trạm này
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bookingDoc.data();
    if (booking.stationId !== stationId) {
      return res.status(400).json({ error: 'Booking does not belong to this station' });
    }
    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      return res.status(400).json({ error: `Cannot check-in when status is ${booking.status}` });
    }

    // Cập nhật booking thành waiting_for_payment
    await bookingRef.update({
      status: BOOKING_STATUS.WAITING_PAYMENT,
      handledBy: req.user.uid,
      updatedAt: new Date()
    });

    res.json({ message: 'Check-in assisted successfully. Driver can now proceed to payment.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy danh sách ports của trạm (kèm trạng thái real-time)
 * GET /api/charging/stations/:stationId/ports
 */
const getPorts = async (req, res) => {
  const { stationId } = req.params;
  try {
    const snapshot = await db.collection(`chargingStations/${stationId}/ports`).get();
    const ports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(ports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { updatePortStatus, assistCheckin, getPorts };