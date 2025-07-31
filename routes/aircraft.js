import express from 'express';
import { protect, adminOnly, adminOrGovernment } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Placeholder routes - will be implemented later
router.get('/', adminOrGovernment, (req, res) => {
  res.json({
    success: true,
    message: 'Aircraft routes - Coming Soon',
    data: []
  });
});

router.post('/', adminOnly, (req, res) => {
  res.json({
    success: true,
    message: 'Aircraft creation - Coming Soon'
  });
});

export default router;