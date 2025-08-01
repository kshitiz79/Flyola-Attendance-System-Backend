import express from 'express';
import {
  getAircraft,
  getAircraftById,
  createAircraft,
  updateAircraft,
  deleteAircraft,
  getAircraftStats
} from '../controllers/aircraftController.js';
import { protect, adminOnly, adminOrGovernment } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Routes
router.route('/')
  .get(adminOrGovernment, getAircraft)
  .post(adminOnly, createAircraft);

router.get('/stats', adminOrGovernment, getAircraftStats);

router.route('/:id')
  .get(adminOrGovernment, getAircraftById)
  .put(adminOnly, updateAircraft)
  .delete(adminOnly, deleteAircraft);

export default router;