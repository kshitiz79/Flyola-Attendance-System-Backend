import { Aircraft, User, sequelize } from '../models/index.js';
import { logAudit } from '../middleware/audit.js';
import { Op } from 'sequelize';

// @desc    Get all aircraft
// @route   GET /api/aircraft
// @access  Private (Admin/Government)
export const getAircraft = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      aircraftId,
      aircraftType,
      availabilityStatus,
      sortBy = 'statusDate',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (aircraftId) {
      where.aircraftId = { [Op.like]: `%${aircraftId}%` };
    }

    if (aircraftType) {
      where.aircraftType = { [Op.like]: `%${aircraftType}%` };
    }

    if (availabilityStatus) {
      where.availabilityStatus = availabilityStatus;
    }

    const { count, rows } = await Aircraft.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows, // Frontend expects data directly
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalRecords: count,
        hasNext: page * limit < count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single aircraft
// @route   GET /api/aircraft/:id
// @access  Private (Admin/Government)
export const getAircraftById = async (req, res, next) => {
  try {
    const aircraft = await Aircraft.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

    if (!aircraft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AIRCRAFT_NOT_FOUND',
          message: 'Aircraft not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: { aircraft }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create aircraft
// @route   POST /api/aircraft
// @access  Private (Admin only)
export const createAircraft = async (req, res, next) => {
  try {
    const {
      aircraftId,
      aircraftType,
      availabilityStatus,
      statusDate,
      statusTime,
      notes
    } = req.body;

    // Validate required fields
    if (!aircraftId || !aircraftType || !availabilityStatus || !statusDate || !statusTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Aircraft ID, type, status, date, and time are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check for duplicate aircraft ID
    const existingAircraft = await Aircraft.findOne({
      where: { aircraftId }
    });

    if (existingAircraft) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_AIRCRAFT',
          message: 'Aircraft with this ID already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    const aircraft = await Aircraft.create({
      aircraftId,
      aircraftType,
      availabilityStatus,
      statusDate,
      statusTime,
      notes,
      updatedBy: req.user.id
    });

    // Log audit
    await logAudit(
      'CREATE',
      'aircraft',
      aircraft.id,
      null,
      aircraft.toJSON(),
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    // Fetch the created record with associations
    const createdAircraft = await Aircraft.findByPk(aircraft.id, {
      include: [
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdAircraft
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update aircraft
// @route   PUT /api/aircraft/:id
// @access  Private (Admin only)
export const updateAircraft = async (req, res, next) => {
  try {
    const aircraft = await Aircraft.findByPk(req.params.id);

    if (!aircraft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AIRCRAFT_NOT_FOUND',
          message: 'Aircraft not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const oldValues = aircraft.toJSON();
    
    const {
      aircraftId,
      aircraftType,
      availabilityStatus,
      statusDate,
      statusTime,
      notes
    } = req.body;

    // Check for duplicate aircraft ID if changing
    if (aircraftId && aircraftId !== aircraft.aircraftId) {
      const existingAircraft = await Aircraft.findOne({
        where: {
          aircraftId,
          id: { [Op.ne]: aircraft.id }
        }
      });

      if (existingAircraft) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DUPLICATE_AIRCRAFT',
            message: 'Aircraft with this ID already exists',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    await aircraft.update({
      aircraftId: aircraftId || aircraft.aircraftId,
      aircraftType: aircraftType || aircraft.aircraftType,
      availabilityStatus: availabilityStatus || aircraft.availabilityStatus,
      statusDate: statusDate || aircraft.statusDate,
      statusTime: statusTime || aircraft.statusTime,
      notes: notes !== undefined ? notes : aircraft.notes,
      updatedBy: req.user.id
    });

    // Log audit
    await logAudit(
      'UPDATE',
      'aircraft',
      aircraft.id,
      oldValues,
      aircraft.toJSON(),
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    // Fetch updated record with associations
    const updatedAircraft = await Aircraft.findByPk(aircraft.id, {
      include: [
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedAircraft
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete aircraft
// @route   DELETE /api/aircraft/:id
// @access  Private (Admin only)
export const deleteAircraft = async (req, res, next) => {
  try {
    const aircraft = await Aircraft.findByPk(req.params.id);

    if (!aircraft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AIRCRAFT_NOT_FOUND',
          message: 'Aircraft not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const oldValues = aircraft.toJSON();

    await aircraft.destroy();

    // Log audit
    await logAudit(
      'DELETE',
      'aircraft',
      aircraft.id,
      oldValues,
      null,
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Aircraft deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aircraft statistics
// @route   GET /api/aircraft/stats
// @access  Private (Admin/Government)
export const getAircraftStats = async (req, res, next) => {
  try {
    // Get counts by status
    const statusCounts = await Aircraft.findAll({
      attributes: [
        'availabilityStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['availabilityStatus'],
      raw: true
    });

    // Get total count
    const totalCount = await Aircraft.count();

    // Get recent updates
    const recentUpdates = await Aircraft.findAll({
      include: [
        {
          model: User,
          as: 'updater',
          attributes: ['firstName', 'lastName']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        total: totalCount,
        statusBreakdown: statusCounts,
        recentUpdates
      }
    });
  } catch (error) {
    next(error);
  }
};