import express from 'express';
import {
  getCrew,
  getCrewById,
  createCrew,
  updateCrew,
  deleteCrew,
  getCrewStats
} from '../controllers/crewController.js';
import { protect, adminOnly, adminOrGovernment } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Routes
router.route('/')
  .get(adminOrGovernment, getCrew)
  .post(adminOnly, createCrew);

router.get('/stats', adminOrGovernment, getCrewStats);

router.route('/:id')
  .get(adminOrGovernment, getCrewById)
  .put(adminOnly, updateCrew)
  .delete(adminOnly, deleteCrew);

export default router;