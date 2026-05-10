// services/bookingService.js
const { db } = require("../utils/firebase");
const { BOOKING_STATUS, PORT_STATUS } = require("../utils/constants");
const { checkBookingConflict, getDistance } = require("../utils/helpers");

/**
 * Tạo booking mới với transaction.
 * @param {Object} bookingData
 * @param {string} bookingData.userId - uid của driver
 * @param {string} bookingData.stationId
 * @param {string} bookingData.portId
 * @param {Date|string} bookingData.estimatedStartTime - có thể là Date object hoặc ISO string
 * @param {number} bookingData.estimatedDuration - số giờ (ví dụ 2)
 * @param {Array} bookingData.selectedServices - mảng các service được chọn, mỗi service có { name, price }
 * @returns {Promise<{success: boolean, bookingId?: string, error?: string}>}
 */
async function createBooking(bookingData) {
  const {
    userId,
    stationId,
    portId,
    estimatedStartTime,
    estimatedDuration,
    selectedServices = [],
  } = bookingData;

  // Chuyển đổi startTime thành Date object
  const startTime = new Date(estimatedStartTime);
  if (isNaN(startTime.getTime())) {
    return { success: false, error: "Invalid estimatedStartTime" };
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 1. Đọc thông tin trạm (để lấy giá, tên, địa chỉ, giờ hoạt động)
      const stationRef = db.collection("chargingStations").doc(stationId);
      const stationDoc = await transaction.get(stationRef);
      if (!stationDoc.exists) {
        throw new Error("Station not found");
      }
      const stationData = stationDoc.data();

      // 2. Kiểm tra giờ hoạt động (nếu trạm không mở 24/7)
      if (stationData.operatingHours && !stationData.operatingHours.is24_7) {
        const openTimeStr = stationData.operatingHours.openTime; // "07:00"
        const closeTimeStr = stationData.operatingHours.closeTime; // "22:00"
        if (openTimeStr && closeTimeStr) {
          const [openHour, openMinute] = openTimeStr.split(":").map(Number);
          const [closeHour, closeMinute] = closeTimeStr.split(":").map(Number);
          const openDateTime = new Date(startTime);
          openDateTime.setHours(openHour, openMinute, 0, 0);
          const closeDateTime = new Date(startTime);
          closeDateTime.setHours(closeHour, closeMinute, 0, 0);
          if (startTime < openDateTime || startTime > closeDateTime) {
            throw new Error("Booking time is outside operating hours");
          }
        }
      }

      // 3. Kiểm tra port: tồn tại và đang available
      const portRef = db
        .collection(`chargingStations/${stationId}/ports`)
        .doc(portId);
      const portDoc = await transaction.get(portRef);
      if (!portDoc.exists) {
        throw new Error("Port not found");
      }
      const portData = portDoc.data();
      if (portData.status !== PORT_STATUS.AVAILABLE) {
        throw new Error(`Port is not available (status: ${portData.status})`);
      }

      // 4. Kiểm tra xung đột lịch trên port này
      const hasConflict = await checkBookingConflict(
        transaction,
        portId,
        startTime,
        estimatedDuration,
      );
      if (hasConflict) {
        throw new Error("Time slot conflicts with existing booking");
      }

      // 5. Tính toán chi phí
      const pricePerHour = stationData.pricePerHour || 0;
      const estimatedChargingCost = pricePerHour * estimatedDuration;
      let totalServiceCost = 0;
      const selectedServicesWithDetails = selectedServices.map((service) => {
        totalServiceCost += service.price || 0;
        return { name: service.name, price: service.price };
      });
      const totalEstimatedAmount = estimatedChargingCost + totalServiceCost;

      // 6. Tạo document booking
      const bookingRef = db.collection("bookings").doc();
      const now = new Date();
      const newBooking = {
        userId,
        stationId,
        portId,
        estimatedStartTime: startTime,
        estimatedDuration,
        selectedServices: selectedServicesWithDetails,
        estimatedChargingCost,
        totalServiceCost,
        totalEstimatedAmount,
        status: BOOKING_STATUS.CONFIRMED,
        // Snapshot thông tin trạm (phòng khi trạm thay đổi sau này)
        stationSnapshot: {
          name: stationData.name,
          address: stationData.address,
          pricePerHour,
        },
        createdAt: now,
        updatedAt: now,
      };
      transaction.set(bookingRef, newBooking);

      // (Không cập nhật port currentBookingId ở bước này, vì chưa check-in)

      return { bookingId: bookingRef.id };
    });

    return { success: true, bookingId: result.bookingId };
  } catch (error) {
    console.error("Create booking error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Hủy booking (chỉ khi status = confirmed hoặc waiting_for_payment)
 * @param {string} bookingId
 * @param {string} userId - người hủy (driver, owner, admin)
 * @param {string} cancelledBy - uid người hủy
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function cancelBooking(bookingId, cancelledBy) {
  const bookingRef = db.collection("bookings").doc(bookingId);
  const bookingDoc = await bookingRef.get();
  if (!bookingDoc.exists) return { success: false, error: "Booking not found" };
  const booking = bookingDoc.data();
  if (
    ![BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.WAITING_PAYMENT].includes(
      booking.status,
    )
  ) {
    return { success: false, error: "Cannot cancel booking in current status" };
  }
  await bookingRef.update({
    status: BOOKING_STATUS.CANCELLED,
    cancelledBy,
    updatedAt: new Date(),
  });
  // Không cần giải phóng port vì chưa chiếm (chỉ khi check-in mới chiếm)
  return { success: true };
}

/**
 * Driver check-in tại trạm (kiểm tra GPS)
 * @param {string} bookingId
 * @param {string} userId
 * @param {number} lat - vĩ độ hiện tại
 * @param {number} lng - kinh độ hiện tại
 * @param {number} stationLat - vĩ độ của trạm
 * @param {number} stationLng - kinh độ của trạm
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function checkinBooking(
  bookingId,
  userId,
  lat,
  lng,
  stationLat,
  stationLng,
) {
  const CHECKIN_RADIUS_KM = 0.05; // 50m
  const distance = getDistance(lat, lng, stationLat, stationLng);
  if (distance > CHECKIN_RADIUS_KM) {
    return {
      success: false,
      error: `You are ${Math.round(distance * 1000)}m away. Please come within 50m to check-in.`,
    };
  }
  const bookingRef = db.collection("bookings").doc(bookingId);
  const bookingDoc = await bookingRef.get();
  if (!bookingDoc.exists) return { success: false, error: "Booking not found" };
  const booking = bookingDoc.data();
  if (booking.userId !== userId)
    return { success: false, error: "Not your booking" };
  if (booking.status !== BOOKING_STATUS.CONFIRMED) {
    return {
      success: false,
      error: `Cannot check-in when status is ${booking.status}`,
    };
  }
  await bookingRef.update({
    status: BOOKING_STATUS.WAITING_PAYMENT,
    updatedAt: new Date(),
  });
  return { success: true };
}

/**
 * Staff/Owner xác nhận đã thu tiền (chuyển waiting_for_payment -> paid -> charging)
 * @param {string} bookingId
 * @param {string} staffId - uid người xác nhận
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function confirmPayment(bookingId, staffId) {
  const bookingRef = db.collection("bookings").doc(bookingId);
  const bookingDoc = await bookingRef.get();
  if (!bookingDoc.exists) return { success: false, error: "Booking not found" };
  const booking = bookingDoc.data();
  if (booking.status !== BOOKING_STATUS.WAITING_PAYMENT) {
    return { success: false, error: "Booking is not waiting for payment" };
  }
  // Cập nhật booking và port trong transaction
  try {
    await db.runTransaction(async (transaction) => {
      const bookingSnap = await transaction.get(bookingRef);
      if (bookingSnap.data().status !== BOOKING_STATUS.WAITING_PAYMENT) {
        throw new Error("Status changed");
      }
      // Cập nhật booking: paid -> charging, ghi actualStartTime
      transaction.update(bookingRef, {
        status: BOOKING_STATUS.CHARGING,
        actualStartTime: new Date(),
        handledBy: staffId,
        updatedAt: new Date(),
      });
      // Cập nhật port: available -> occupied, gán currentBookingId
      const portRef = db
        .collection(`chargingStations/${booking.stationId}/ports`)
        .doc(booking.portId);
      transaction.update(portRef, {
        status: PORT_STATUS.OCCUPIED,
        currentBookingId: bookingId,
        lastUpdated: new Date(),
      });
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Kết thúc sạc (driver hoặc staff/owner)
 * @param {string} bookingId
 * @param {string} userId
 * @param {string} role - role của người thực hiện
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function endCharging(bookingId, userId, role) {
  const bookingRef = db.collection("bookings").doc(bookingId);
  const bookingDoc = await bookingRef.get();
  if (!bookingDoc.exists) return { success: false, error: "Booking not found" };
  const booking = bookingDoc.data();
  // Kiểm tra quyền: driver của booking, staff/owner của trạm, hoặc admin
  const isDriver = booking.userId === userId;
  const isStaffOrOwner =
    role === "staff" || role === "station_owner" || role === "admin";
  if (!isDriver && !isStaffOrOwner) {
    return { success: false, error: "Permission denied" };
  }
  if (booking.status !== BOOKING_STATUS.CHARGING) {
    return { success: false, error: "Booking is not in charging state" };
  }
  try {
    await db.runTransaction(async (transaction) => {
      const bookingSnap = await transaction.get(bookingRef);
      if (bookingSnap.data().status !== BOOKING_STATUS.CHARGING) {
        throw new Error("Status changed");
      }
      const actualEndTime = new Date();
      // Cập nhật booking thành completed
      transaction.update(bookingRef, {
        status: BOOKING_STATUS.COMPLETED,
        actualEndTime,
        updatedAt: new Date(),
      });
      // Giải phóng port: chuyển về available, xóa currentBookingId
      const portRef = db
        .collection(`chargingStations/${booking.stationId}/ports`)
        .doc(booking.portId);
      transaction.update(portRef, {
        status: PORT_STATUS.AVAILABLE,
        currentBookingId: null,
        lastUpdated: new Date(),
      });
      // (Tuỳ chọn) Tạo chargingHistory
      const historyRef = db.collection("chargingHistory").doc();
      transaction.set(historyRef, {
        userId: booking.userId,
        stationId: booking.stationId,
        portId: booking.portId,
        bookingId,
        actualStartTime: booking.actualStartTime,
        actualEndTime,
        actualDuration: Math.round(
          (actualEndTime - booking.actualStartTime.toDate()) / 60000,
        ),
        finalTotalAmount: booking.totalEstimatedAmount,
        status: BOOKING_STATUS.COMPLETED,
        completedAt: actualEndTime,
      });
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  createBooking,
  cancelBooking,
  checkinBooking,
  confirmPayment,
  endCharging,
};
