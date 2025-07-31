import express from 'express';
import { protect, adminOnly, adminOrGovernment } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Placeholder routes - will be implemented later
router.get('/', adminOrGovernment, (req, res) => {
  res.json({
    success: true,
    message: 'Documents routes - Coming Soon',
    data: []
  });
});

router.post('/upload', adminOnly, (req, res) => {
  res.json({
    success: true,
    message: 'Document upload - Coming Soon'
  });
});

export default router;