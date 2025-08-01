import { Attendance, User, sequelize } from '../models/index.js';
import { logAudit } from '../middleware/audit.js';
import { Op } from 'sequelize';

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private (Admin/Government)
export const getAttendance = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      staffName,
      staffType,
      status,
      startDate,
      endDate,
      sortBy = 'attendanceDate',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (staffName) {
      where.staffName = { [Op.like]: `%${staffName}%` };
    }

    if (staffType) {
      where.staffType = staffType;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.attendanceDate = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.attendanceDate = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      where.attendanceDate = {
        [Op.lte]: endDate
      };
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'recorder',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        attendance: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalRecords: count,
          hasNext: page * limit < count,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single attendance record
// @route   GET /api/attendance/:id
// @access  Private (Admin/Government)
export const getAttendanceById = async (req, res, next) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'recorder',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

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

    res.json({
      success: true,
      data: { attendance }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create attendance record
// @route   POST /api/attendance
// @access  Private (Admin only)
export const createAttendance = async (req, res, next) => {
  try {
    const {
      staffName,
      staffType,
      attendanceDate,
      attendanceTime,
      status = 'present',
      notes
    } = req.body;

    // Validate required fields
    if (!staffName || !staffType || !attendanceDate || !attendanceTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Staff name, type, date, and time are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check for duplicate entry (same staff, same date)
    const existingAttendance = await Attendance.findOne({
      where: {
        staffName,
        attendanceDate
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_ATTENDANCE',
          message: 'Attendance record already exists for this staff member on this date',
          timestamp: new Date().toISOString()
        }
      });
    }

    const attendance = await Attendance.create({
      staffName,
      staffType,
      attendanceDate,
      attendanceTime,
      status,
      notes,
      recordedBy: req.user.id
    });

    // Log audit
    await logAudit(
      'CREATE',
      'attendance',
      attendance.id,
      null,
      attendance.toJSON(),
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    // Fetch the created record with associations
    const createdAttendance = await Attendance.findByPk(attendance.id, {
      include: [
        {
          model: User,
          as: 'recorder',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: { attendance: createdAttendance }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private (Admin only)
export const updateAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id);

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

    const oldValues = attendance.toJSON();
    
    const {
      staffName,
      staffType,
      attendanceDate,
      attendanceTime,
      status,
      notes
    } = req.body;

    // Check for duplicate if changing staff name or date
    if ((staffName && staffName !== attendance.staffName) || 
        (attendanceDate && attendanceDate !== attendance.attendanceDate)) {
      const existingAttendance = await Attendance.findOne({
        where: {
          staffName: staffName || attendance.staffName,
          attendanceDate: attendanceDate || attendance.attendanceDate,
          id: { [Op.ne]: attendance.id }
        }
      });

      if (existingAttendance) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DUPLICATE_ATTENDANCE',
            message: 'Attendance record already exists for this staff member on this date',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    await attendance.update({
      staffName: staffName || attendance.staffName,
      staffType: staffType || attendance.staffType,
      attendanceDate: attendanceDate || attendance.attendanceDate,
      attendanceTime: attendanceTime || attendance.attendanceTime,
      status: status || attendance.status,
      notes: notes !== undefined ? notes : attendance.notes
    });

    // Log audit
    await logAudit(
      'UPDATE',
      'attendance',
      attendance.id,
      oldValues,
      attendance.toJSON(),
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    // Fetch updated record with associations
    const updatedAttendance = await Attendance.findByPk(attendance.id, {
      include: [
        {
          model: User,
          as: 'recorder',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

    res.json({
      success: true,
      data: { attendance: updatedAttendance }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private (Admin only)
export const deleteAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id);

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

    const oldValues = attendance.toJSON();

    await attendance.destroy();

    // Log audit
    await logAudit(
      'DELETE',
      'attendance',
      attendance.id,
      oldValues,
      null,
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance report/statistics
// @route   GET /api/attendance/report
// @access  Private (Admin/Government)
export const getAttendanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate, staffType } = req.query;
    
    const where = {};
    
    if (startDate && endDate) {
      where.attendanceDate = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    if (staffType) {
      where.staffType = staffType;
    }

    // Get total counts by status
    const statusCounts = await Attendance.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get counts by staff type
    const staffTypeCounts = await Attendance.findAll({
      where,
      attributes: [
        'staffType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['staffType'],
      raw: true
    });

    // Get daily attendance counts
    const dailyCounts = await Attendance.findAll({
      where,
      attributes: [
        'attendanceDate',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['attendanceDate'],
      order: [['attendanceDate', 'ASC']],
      raw: true
    });

    // Get total unique staff members
    const uniqueStaff = await Attendance.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('staffName'))), 'count']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalRecords: statusCounts.reduce((sum, item) => sum + parseInt(item.count), 0),
          uniqueStaff: uniqueStaff[0]?.count || 0
        },
        statusBreakdown: statusCounts,
        staffTypeBreakdown: staffTypeCounts,
        dailyTrends: dailyCounts
      }
    });
  } catch (error) {
    next(error);
  }
};