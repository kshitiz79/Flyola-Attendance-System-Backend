import express from 'express';
import {
  getDepartures,
  getDepartureById,
  createDeparture,
  updateDeparture,
  deleteDeparture,
  getDepartureStats
} from '../controllers/departureController.js';
import { protect, adminOnly, adminOrGovernment } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Routes
router.route('/')
  .get(adminOrGovernment, getDepartures)
  .post(adminOnly, createDeparture);

router.get('/stats', adminOrGovernment, getDepartureStats);

router.route('/:id')
  .get(adminOrGovernment, getDepartureById)
  .put(adminOnly, updateDeparture)
  .delete(adminOnly, deleteDeparture);

export default router;