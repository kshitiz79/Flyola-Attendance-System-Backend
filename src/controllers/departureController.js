import { Departure, User, sequelize } from '../models/index.js';
import { logAudit } from '../middleware/audit.js';
import { Op } from 'sequelize';

// @desc    Get all departures
// @route   GET /api/departures
// @access  Private (Admin/Government)
export const getDepartures = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      flightId,
      aircraftId,
      status,
      departureDate,
      startDate,
      endDate,
      sortBy = 'departureDate',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (flightId) {
      where.flightId = { [Op.like]: `%${flightId}%` };
    }

    if (aircraftId) {
      where.aircraftId = { [Op.like]: `%${aircraftId}%` };
    }

    if (status) {
      where.status = status;
    }

    if (departureDate) {
      where.departureDate = departureDate;
    } else if (startDate && endDate) {
      where.departureDate = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.departureDate = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      where.departureDate = {
        [Op.lte]: endDate
      };
    }

    const { count, rows } = await Departure.findAndCountAll({
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

// @desc    Get single departure
// @route   GET /api/departures/:id
// @access  Private (Admin/Government)
export const getDepartureById = async (req, res, next) => {
  try {
    const departure = await Departure.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'recorder',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

    if (!departure) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEPARTURE_NOT_FOUND',
          message: 'Departure record not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: { departure }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create departure
// @route   POST /api/departures
// @access  Private (Admin only)
export const createDeparture = async (req, res, next) => {
  try {
    const {
      flightId,
      aircraftId,
      estimatedDeparture,
      actualDeparture,
      departureDate,
      status = 'scheduled',
      notes
    } = req.body;

    // Validate required fields
    if (!flightId || !aircraftId || !estimatedDeparture || !departureDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Flight ID, aircraft ID, estimated departure, and departure date are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Calculate variance if actual departure is provided
    let variance = null;
    if (actualDeparture) {
      const etd = new Date(estimatedDeparture);
      const atd = new Date(actualDeparture);
      variance = Math.round((atd - etd) / (1000 * 60)); // Convert to minutes
    }

    const departure = await Departure.create({
      flightId,
      aircraftId,
      estimatedDeparture,
      actualDeparture,
      variance,
      departureDate,
      status,
      notes,
      recordedBy: req.user.id
    });

    // Log audit
    await logAudit(
      'CREATE',
      'departures',
      departure.id,
      null,
      departure.toJSON(),
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    // Fetch the created record with associations
    const createdDeparture = await Departure.findByPk(departure.id, {
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
      data: createdDeparture
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update departure
// @route   PUT /api/departures/:id
// @access  Private (Admin only)
export const updateDeparture = async (req, res, next) => {
  try {
    const departure = await Departure.findByPk(req.params.id);

    if (!departure) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEPARTURE_NOT_FOUND',
          message: 'Departure record not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const oldValues = departure.toJSON();
    
    const {
      flightId,
      aircraftId,
      estimatedDeparture,
      actualDeparture,
      departureDate,
      status,
      notes
    } = req.body;

    // Calculate variance if both ETD and ATD are provided
    let variance = departure.variance;
    const newETD = estimatedDeparture || departure.estimatedDeparture;
    const newATD = actualDeparture || departure.actualDeparture;
    
    if (newETD && newATD) {
      const etd = new Date(newETD);
      const atd = new Date(newATD);
      variance = Math.round((atd - etd) / (1000 * 60)); // Convert to minutes
    }

    await departure.update({
      flightId: flightId || departure.flightId,
      aircraftId: aircraftId || departure.aircraftId,
      estimatedDeparture: estimatedDeparture || departure.estimatedDeparture,
      actualDeparture: actualDeparture !== undefined ? actualDeparture : departure.actualDeparture,
      variance,
      departureDate: departureDate || departure.departureDate,
      status: status || departure.status,
      notes: notes !== undefined ? notes : departure.notes
    });

    // Log audit
    await logAudit(
      'UPDATE',
      'departures',
      departure.id,
      oldValues,
      departure.toJSON(),
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    // Fetch updated record with associations
    const updatedDeparture = await Departure.findByPk(departure.id, {
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
      data: updatedDeparture
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete departure
// @route   DELETE /api/departures/:id
// @access  Private (Admin only)
export const deleteDeparture = async (req, res, next) => {
  try {
    const departure = await Departure.findByPk(req.params.id);

    if (!departure) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEPARTURE_NOT_FOUND',
          message: 'Departure record not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const oldValues = departure.toJSON();

    await departure.destroy();

    // Log audit
    await logAudit(
      'DELETE',
      'departures',
      departure.id,
      oldValues,
      null,
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Departure record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get departure statistics
// @route   GET /api/departures/stats
// @access  Private (Admin/Government)
export const getDepartureStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};

    if (startDate && endDate) {
      where.departureDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    // Get counts by status
    const statusCounts = await Departure.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get performance metrics
    const performanceMetrics = await Departure.findAll({
      where: {
        ...where,
        variance: { [Op.ne]: null }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalFlights'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN variance <= 0 THEN 1 END')), 'onTime'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN variance > 0 AND variance <= 15 THEN 1 END')), 'slightlyDelayed'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN variance > 15 THEN 1 END')), 'significantlyDelayed'],
        [sequelize.fn('AVG', sequelize.col('variance')), 'averageVariance']
      ],
      raw: true
    });

    // Get daily departure counts
    const dailyCounts = await Departure.findAll({
      where,
      attributes: [
        'departureDate',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['departureDate'],
      order: [['departureDate', 'ASC']],
      raw: true
    });

    // Get total count
    const totalCount = await Departure.count({ where });

    res.json({
      success: true,
      data: {
        total: totalCount,
        statusBreakdown: statusCounts,
        performance: performanceMetrics[0] || {
          totalFlights: 0,
          onTime: 0,
          slightlyDelayed: 0,
          significantlyDelayed: 0,
          averageVariance: 0
        },
        dailyTrends: dailyCounts
      }
    });
  } catch (error) {
    next(error);
  }
};