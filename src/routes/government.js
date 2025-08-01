import express from 'express';
import { protect, governmentOnly } from '../middleware/auth.js';
import { getGovernmentDashboardStats } from '../controllers/dashboardController.js';
import {
  getAircraft,
  getAircraftById,
  getAircraftStats
} from '../controllers/aircraftController.js';
import {
  getCrew,
  getCrewById,
  getCrewStats
} from '../controllers/crewController.js';
import {
  getDepartures,
  getDepartureById,
  getDepartureStats
} from '../controllers/departureController.js';
import {
  getDocuments,
  getDocumentById,
  downloadDocument,
  getDocumentStats
} from '../controllers/documentController.js';
import { Attendance, User } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

// Apply authentication and government role check to all routes
router.use(protect);
router.use(governmentOnly);

// Dashboard
router.get('/dashboard/stats', getGovernmentDashboardStats);

// Aircraft routes (view only)
router.get('/aircraft', getAircraft);
router.get('/aircraft/stats', getAircraftStats);
router.get('/aircraft/:id', getAircraftById);

// Crew routes (view only)
router.get('/crew', getCrew);
router.get('/crew/stats', getCrewStats);
router.get('/crew/:id', getCrewById);

// Departure routes (view only)
router.get('/departures', getDepartures);
router.get('/departures/stats', getDepartureStats);
router.get('/departures/:id', getDepartureById);

// Document routes (view and download only)
router.get('/documents', getDocuments);
router.get('/documents/stats', getDocumentStats);
router.get('/documents/:id', getDocumentById);
router.get('/documents/:id/download', downloadDocument);

// Attendance routes (view only for government)
router.get('/attendance', async (req, res) => {
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
    console.error('Get government attendance error:', error);
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

// Attendance stats for government
router.get('/attendance/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];

    // Today's attendance count
    const todayCount = await Attendance.count({
      where: {
        date: today
      }
    });

    // This week's attendance count
    const weekCount = await Attendance.count({
      where: {
        date: {
          [Op.gte]: weekStart
        }
      }
    });

    res.json({
      success: true,
      data: {
        today: todayCount,
        thisWeek: weekCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get government attendance stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch attendance statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;