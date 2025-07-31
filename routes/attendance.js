import express from 'express';
import { Attendance, User } from '../models/index.js';
import { protect as auth } from '../middleware/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

// Get today's attendance for current user
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const attendance = await Attendance.findOne({
      where: {
        userId: req.user.id,
        date: today
      }
    });

    res.json({
      success: true,
      data: attendance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch today\'s attendance',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Check in
router.post('/checkin', auth, async (req, res) => {
  try {
    const { latitude = null, longitude = null } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Check if already checked in today
    let attendance = await Attendance.findOne({
      where: {
        userId: req.user.id,
        date: today
      }
    });

    if (attendance && attendance.checkInTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_CHECKED_IN',
          message: 'You have already checked in today',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Determine status based on time (assuming 9 AM is standard time)
    const standardTime = new Date();
    standardTime.setHours(9, 0, 0, 0);
    const status = now > standardTime ? 'late' : 'present';

    if (attendance) {
      // Update existing record
      await attendance.update({
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        status
      });
    } else {
      // Create new record
      attendance = await Attendance.create({
        userId: req.user.id,
        date: today,
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        status
      });
    }

    res.json({
      success: true,
      data: attendance,
      message: 'Checked in successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check in',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Check out
router.post('/checkout', auth, async (req, res) => {
  try {
    const { latitude = null, longitude = null } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      where: {
        userId: req.user.id,
        date: today
      }
    });

    if (!attendance || !attendance.checkInTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOT_CHECKED_IN',
          message: 'You must check in first',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_CHECKED_OUT',
          message: 'You have already checked out today',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Calculate hours worked
    const checkInTime = new Date(attendance.checkInTime);
    const hoursWorked = ((now - checkInTime) / (1000 * 60 * 60)).toFixed(2);

    // Update attendance record
    await attendance.update({
      checkOutTime: now,
      checkOutLatitude: latitude,
      checkOutLongitude: longitude,
      hoursWorked: parseFloat(hoursWorked)
    });

    res.json({
      success: true,
      data: attendance,
      message: 'Checked out successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check out',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get user's attendance history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      userId: req.user.id
    };

    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const { count, rows: attendance } = await Attendance.findAndCountAll({
      where: whereClause,
      order: [['date', 'DESC']],
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
    console.error('Get attendance history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch attendance history',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get attendance statistics for current user
router.get('/stats', auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Weekly stats
    const weeklyAttendance = await Attendance.findAll({
      where: {
        userId: req.user.id,
        date: {
          [Op.gte]: startOfWeek.toISOString().split('T')[0]
        }
      }
    });

    // Monthly stats
    const monthlyAttendance = await Attendance.findAll({
      where: {
        userId: req.user.id,
        date: {
          [Op.gte]: startOfMonth.toISOString().split('T')[0]
        }
      }
    });

    const weeklyStats = {
      daysPresent: weeklyAttendance.filter(a => a.status === 'present' || a.status === 'late').length,
      totalHours: weeklyAttendance.reduce((sum, a) => sum + (parseFloat(a.hoursWorked) || 0), 0).toFixed(2),
      averageHours: weeklyAttendance.length > 0 
        ? (weeklyAttendance.reduce((sum, a) => sum + (parseFloat(a.hoursWorked) || 0), 0) / weeklyAttendance.length).toFixed(2)
        : 0
    };

    const monthlyStats = {
      daysPresent: monthlyAttendance.filter(a => a.status === 'present' || a.status === 'late').length,
      totalHours: monthlyAttendance.reduce((sum, a) => sum + (parseFloat(a.hoursWorked) || 0), 0).toFixed(2),
      attendanceRate: monthlyAttendance.length > 0 
        ? ((monthlyAttendance.filter(a => a.status === 'present' || a.status === 'late').length / monthlyAttendance.length) * 100).toFixed(1)
        : 0
    };

    res.json({
      success: true,
      data: {
        weekly: weeklyStats,
        monthly: monthlyStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
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

// Get recent attendance records for current user
router.get('/recent', auth, async (req, res) => {
  try {
    const attendance = await Attendance.findAll({
      where: {
        userId: req.user.id
      },
      order: [['date', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: attendance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get recent attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch recent attendance',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Admin routes - Get all users' attendance
router.get('/admin/all', auth, async (req, res) => {
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
    console.error('Get all attendance error:', error);
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

// Admin route - Update attendance record
router.put('/admin/:id', auth, async (req, res) => {
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
    const { checkInTime, checkOutTime, status, notes } = req.body;

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ATTENDANCE_NOT_FOUND',
          message: 'Attendance record not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Calculate hours worked if both times are provided
    let hoursWorked = attendance.hoursWorked;
    if (checkInTime && checkOutTime) {
      const checkIn = new Date(checkInTime);
      const checkOut = new Date(checkOutTime);
      hoursWorked = ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2);
    }

    await attendance.update({
      ...(checkInTime && { checkInTime }),
      ...(checkOutTime && { checkOutTime }),
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      ...(hoursWorked && { hoursWorked: parseFloat(hoursWorked) })
    });

    // Fetch updated record with user info
    const updatedAttendance = await Attendance.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username', 'designation']
      }]
    });

    res.json({
      success: true,
      data: updatedAttendance,
      message: 'Attendance record updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update attendance record',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Admin route - Create attendance record
router.post('/admin/create', auth, async (req, res) => {
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

    const { userId, date, checkInTime, checkOutTime, status, notes } = req.body;

    // Validate required fields
    if (!userId || !date || !status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User ID, date, and status are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if attendance record already exists for this user and date
    const existingRecord = await Attendance.findOne({
      where: {
        userId,
        date
      }
    });

    if (existingRecord) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'RECORD_EXISTS',
          message: 'Attendance record already exists for this user and date',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Calculate hours worked if both times are provided
    let hoursWorked = null;
    if (checkInTime && checkOutTime) {
      const checkIn = new Date(checkInTime);
      const checkOut = new Date(checkOutTime);
      hoursWorked = ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2);
    }

    // Create attendance record
    const attendance = await Attendance.create({
      userId,
      date,
      checkInTime: checkInTime || null,
      checkOutTime: checkOutTime || null,
      hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
      status,
      notes: notes || null
    });

    // Fetch created record with user info
    const createdAttendance = await Attendance.findByPk(attendance.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username', 'designation']
      }]
    });

    res.status(201).json({
      success: true,
      data: createdAttendance,
      message: 'Attendance record created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create attendance record',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Admin route - Delete attendance record
router.delete('/admin/:id', auth, async (req, res) => {
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

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ATTENDANCE_NOT_FOUND',
          message: 'Attendance record not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    await attendance.destroy();

    res.json({
      success: true,
      message: 'Attendance record deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete attendance record',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;