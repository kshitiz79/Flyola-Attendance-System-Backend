import express from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';

import { User, Attendance } from '../models/index.js';
import { protect as auth, adminOnly } from '../middleware/auth.js';
import { getAdminDashboardStats } from '../controllers/dashboardController.js';

// Import controllers for admin-specific routes
import {
  getAircraft,
  getAircraftById,
  createAircraft,
  updateAircraft,
  deleteAircraft,
  getAircraftStats
} from '../controllers/aircraftController.js';

import {
  getCrew,
  getCrewById,
  createCrew,
  updateCrew,
  deleteCrew,
  getCrewStats
} from '../controllers/crewController.js';

import {
  getDepartures,
  getDepartureById,
  createDeparture,
  updateDeparture,
  deleteDeparture,
  getDepartureStats
} from '../controllers/departureController.js';

import {
  getDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getDocumentStats,
  upload
} from '../controllers/documentController.js';

const router = express.Router();


// Dashboard stats
router.get('/dashboard/stats', auth, adminOnly, getAdminDashboardStats);

// Aircraft management routes (Admin only)
router.route('/aircraft')
  .get(auth, adminOnly, getAircraft)
  .post(auth, adminOnly, createAircraft);

router.get('/aircraft/stats', auth, adminOnly, getAircraftStats);

router.route('/aircraft/:id')
  .get(auth, adminOnly, getAircraftById)
  .put(auth, adminOnly, updateAircraft)
  .delete(auth, adminOnly, deleteAircraft);

// Crew management routes (Admin only)
router.route('/crew')
  .get(auth, adminOnly, getCrew)
  .post(auth, adminOnly, createCrew);

router.get('/crew/stats', auth, adminOnly, getCrewStats);

router.route('/crew/:id')
  .get(auth, adminOnly, getCrewById)
  .put(auth, adminOnly, updateCrew)
  .delete(auth, adminOnly, deleteCrew);

// Departure management routes (Admin only)
router.route('/departures')
  .get(auth, adminOnly, getDepartures)
  .post(auth, adminOnly, createDeparture);

router.get('/departures/stats', auth, adminOnly, getDepartureStats);

router.route('/departures/:id')
  .get(auth, adminOnly, getDepartureById)
  .put(auth, adminOnly, updateDeparture)
  .delete(auth, adminOnly, deleteDeparture);

// Document management routes (Admin only)
router.route('/documents')
  .get(auth, adminOnly, getDocuments)
  .post(auth, adminOnly, upload.single('file'), uploadDocument);

router.get('/documents/stats', auth, adminOnly, getDocumentStats);

router.route('/documents/:id')
  .get(auth, adminOnly, getDocumentById)
  .put(auth, adminOnly, upload.single('file'), updateDocument)
  .delete(auth, adminOnly, deleteDocument);

router.get('/documents/:id/download', auth, adminOnly, downloadDocument);

// Get all users (Admin only)
router.get('/users', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Admin role required.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: users,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch users',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Create new user (Admin only)
router.post('/users', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Admin role required.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const {
      firstName,
      lastName,
      username,
      email,
      phoneNumber,
      designation,
      role,
      password
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All required fields must be provided',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'Username or email already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      phoneNumber,
      designation,
      role,
      password: hashedPassword,
      isActive: true
    });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse,
      message: 'User created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create user',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Update user (Admin only)
router.put('/users/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Admin role required.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { id } = req.params;
    const {
      firstName,
      lastName,
      username,
      email,
      phoneNumber,
      designation,
      role,
      isActive
    } = req.body;

    // Find user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if username or email already exists (excluding current user)
    if (username || email) {
      const existingUser = await User.findOne({
        where: {
          id: { [Op.ne]: id },
          [Op.or]: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : [])
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'Username or email already exists',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Update user
    await user.update({
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(username && { username }),
      ...(email && { email }),
      ...(phoneNumber && { phoneNumber }),
      ...(designation && { designation }),
      ...(role && { role }),
      ...(typeof isActive === 'boolean' && { isActive })
    });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      data: userResponse,
      message: 'User updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Admin role required.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: 'Cannot delete your own account',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Delete user
    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete user',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get user by ID (Admin only)
router.get('/users/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Admin role required.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Admin attendance routes
router.get('/attendance', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, userId, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    const { count, rows: attendance } = await Attendance.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username', 'designation']
      }],
      order: [['date', 'DESC'], ['checkInTime', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        attendance,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalRecords: count,
          hasNext: page * limit < count,
          hasPrev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get admin attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch attendance records',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;