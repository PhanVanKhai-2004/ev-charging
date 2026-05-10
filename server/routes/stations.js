// routes/stations.js
const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');
const { verifyToken } = require('../middleware/auth');
const { requireStationOwner, requireRole } = require('../middleware/roleCheck');
const { ROLES } = require('../utils/constants');

// Public routes (driver có thể xem)
router.get('/', stationController.getStations);
router.get('/:stationId', stationController.getStationDetail);
router.get('/:stationId/ports', stationController.getPorts);

// Các route yêu cầu đăng nhập và là station owner (hoặc admin)
router.post('/', verifyToken, requireRole([ROLES.STATION_OWNER, ROLES.ADMIN]), stationController.createStation);
router.put('/:stationId', verifyToken, requireStationOwner, stationController.updateStation);
router.delete('/:stationId', verifyToken, requireStationOwner, stationController.deleteStation);

// Port management
router.post('/:stationId/ports', verifyToken, requireStationOwner, stationController.createPort);
router.put('/:stationId/ports/:portId', verifyToken, requireStationOwner, stationController.updatePort);
router.delete('/:stationId/ports/:portId', verifyToken, requireStationOwner, stationController.deletePort);

module.exports = router;