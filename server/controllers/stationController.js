// controllers/stationController.js
const { db, admin } = require('../utils/firebase');
const stationModel = require('../models/stationModel');
const userModel = require('../models/userModel');
const { ROLES, PORT_STATUS } = require('../utils/constants');

// ======================= TRẠM SẠC =======================

/**
 * Lấy danh sách trạm (có thể lọc gần đúng theo lat/lng)
 * GET /api/stations?lat=...&lng=...&radius=... (radius km)
 */
const getStations = async (req, res) => {
  const { lat, lng, radius } = req.query;
  try {
    let stations = await stationModel.findAll(100);
    if (lat && lng && radius) {
      const { getDistance } = require('../utils/helpers');
      stations = stations.filter(s => {
        const dist = getDistance(parseFloat(lat), parseFloat(lng), s.location.latitude, s.location.longitude);
        return dist <= parseFloat(radius);
      });
    }
    res.json(stations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy chi tiết trạm + danh sách ports
 * GET /api/stations/:stationId
 */
const getStationDetail = async (req, res) => {
  const { stationId } = req.params;
  try {
    const station = await stationModel.findById(stationId);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    const ports = await stationModel.getPorts(stationId);
    res.json({ ...station, ports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Tạo trạm mới (chủ trạm)
 * POST /api/stations
 * Body: { name, address, location: { lat, lng }, pricePerHour, operatingHours, additionalServices, images }
 */
const createStation = async (req, res) => {
  const ownerId = req.user.uid;
  const { name, address, location, pricePerHour, operatingHours, additionalServices, images } = req.body;
  if (!name || !address || !location || !pricePerHour) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const stationId = db.collection('chargingStations').doc().id;
    const stationData = {
      name,
      address,
      location: new admin.firestore.GeoPoint(location.lat, location.lng),
      ownerId,
      pricePerHour,
      operatingHours: operatingHours || { is24_7: true },
      additionalServices: additionalServices || [],
      images: images || [],
      totalPorts: 0,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await stationModel.create(stationId, stationData);
    // Cập nhật stationIds của owner
    const owner = await userModel.findById(ownerId);
    const stationIds = owner.stationIds || [];
    stationIds.push(stationId);
    await userModel.update(ownerId, { stationIds });
    res.status(201).json({ stationId, ...stationData });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Cập nhật trạm (chỉ owner)
 * PUT /api/stations/:stationId
 */
const updateStation = async (req, res) => {
  const { stationId } = req.params;
  const updates = req.body;
  delete updates.ownerId; // không cho đổi chủ
  delete updates.createdAt;
  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  try {
    await stationModel.update(stationId, updates);
    res.json({ message: 'Station updated' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Xóa trạm (chỉ khi không có booking active)
 * DELETE /api/stations/:stationId
 */
const deleteStation = async (req, res) => {
  const { stationId } = req.params;
  // Kiểm tra booking active
  const activeBookings = await db.collection('bookings')
    .where('stationId', '==', stationId)
    .where('status', 'in', ['confirmed', 'waiting_for_payment', 'paid', 'charging'])
    .limit(1)
    .get();
  if (!activeBookings.empty) {
    return res.status(400).json({ error: 'Cannot delete station with active bookings' });
  }
  try {
    // Xóa tất cả ports subcollection
    const ports = await stationModel.getPorts(stationId);
    for (const port of ports) {
      await stationModel.deletePort(stationId, port.id);
    }
    await stationModel.deleteStation(stationId);
    // Xóa stationId khỏi owner's stationIds
    const station = await stationModel.findById(stationId);
    if (station && station.ownerId) {
      const owner = await userModel.findById(station.ownerId);
      const stationIds = (owner.stationIds || []).filter(id => id !== stationId);
      await userModel.update(station.ownerId, { stationIds });
    }
    res.json({ message: 'Station deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ======================= CỔNG SẠC (PORTS) =======================

/**
 * Lấy danh sách ports của trạm
 * GET /api/stations/:stationId/ports
 */
const getPorts = async (req, res) => {
  const { stationId } = req.params;
  try {
    const ports = await stationModel.getPorts(stationId);
    res.json(ports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Thêm port mới
 * POST /api/stations/:stationId/ports
 * Body: { portNumber, powerKW, connectorType, status? }
 */
const createPort = async (req, res) => {
  const { stationId } = req.params;
  const { portNumber, powerKW, connectorType, status } = req.body;
  if (!portNumber || !powerKW) {
    return res.status(400).json({ error: 'Missing portNumber or powerKW' });
  }
  try {
    const portId = db.collection(`chargingStations/${stationId}/ports`).doc().id;
    const portData = {
      portNumber,
      powerKW,
      connectorType: connectorType || 'CCS2',
      status: status || PORT_STATUS.AVAILABLE,
      currentBookingId: null,
      lastUpdated: new Date()
    };
    await stationModel.createPort(stationId, portId, portData);
    // Cập nhật totalPorts của trạm
    const station = await stationModel.findById(stationId);
    await stationModel.update(stationId, { totalPorts: (station.totalPorts || 0) + 1 });
    res.status(201).json({ portId, ...portData });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Cập nhật port (chỉ staff/owner)
 * PUT /api/stations/:stationId/ports/:portId
 * Body: { status, portNumber, powerKW, connectorType }
 */
const updatePort = async (req, res) => {
  const { stationId, portId } = req.params;
  const updates = req.body;
  try {
    // Nếu cập nhật status = maintenance/offline, không cần kiểm tra booking active (để controller hoặc service)
    // Nhưng nếu muốn kiểm tra, có thể làm như trong thiết kế. Ở đây tạm cho phép.
    await stationModel.updatePort(stationId, portId, { ...updates, lastUpdated: new Date() });
    res.json({ message: 'Port updated' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Xóa port (chỉ khi không có booking active)
 * DELETE /api/stations/:stationId/ports/:portId
 */
const deletePort = async (req, res) => {
  const { stationId, portId } = req.params;
  // Kiểm tra booking active trên port này
  const activeBookings = await db.collection('bookings')
    .where('portId', '==', portId)
    .where('status', 'in', ['confirmed', 'waiting_for_payment', 'paid', 'charging'])
    .limit(1)
    .get();
  if (!activeBookings.empty) {
    return res.status(400).json({ error: 'Cannot delete port with active bookings' });
  }
  try {
    await stationModel.deletePort(stationId, portId);
    // Giảm totalPorts của trạm
    const station = await stationModel.findById(stationId);
    if (station) {
      await stationModel.update(stationId, { totalPorts: Math.max(0, (station.totalPorts || 0) - 1) });
    }
    res.json({ message: 'Port deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getStations,
  getStationDetail,
  createStation,
  updateStation,
  deleteStation,
  getPorts,
  createPort,
  updatePort,
  deletePort
};