import express from 'express';
import { login, logout, verifyToken, refreshToken } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/logout', protect, logout);
router.get('/verify', protect, verifyToken);

export default router;