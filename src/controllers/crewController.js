import { Crew, User, sequelize } from '../models/index.js';
import { logAudit } from '../middleware/audit.js';
import { Op } from 'sequelize';

// @desc    Get all crew members
// @route   GET /api/crew
// @access  Private (Admin/Government)
export const createCrew = async (req, res, next) => {
  try {
    console.log('createCrew called with:', req.body, 'user:', req.user);
    const { crewName, crewRole, availabilityStatus, statusDate, statusTime, notes } = req.body;

    if (!crewName || !crewRole || !availabilityStatus || !statusDate || !statusTime) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REQUIRED_FIELDS', message: 'Crew name, role, status, date, and time are required' }
      });
    }

    const crew = await Crew.create({
      crewName,
      crewRole,
      availabilityStatus,
      statusDate,
      statusTime,
      notes,
      updatedBy: req.user.id
    });

    await logAudit('CREATE', 'crew', crew.id, null, crew.toJSON(), req.user.id, req.ip, req.get('User-Agent'));

    const createdCrew = await Crew.findByPk(crew.id, {
      include: [{ model: User, as: 'updater', attributes: ['id', 'firstName', 'lastName', 'username'] }]
    });

    res.status(201).json({ success: true, data: createdCrew });
  } catch (error) {
    console.error('createCrew error:', error);
    next(error);
  }
};

export const getCrew = async (req, res, next) => {
  try {
    console.log('getCrew called with query:', req.query, 'user:', req.user);
    const { page = 1, limit = 20, crewName, crewRole, availabilityStatus, sortBy = 'statusDate', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (crewName) where.crewName = { [Op.like]: `%${crewName}%` };
    if (crewRole) where.crewRole = { [Op.like]: `%${crewRole}%` };
    if (availabilityStatus) where.availabilityStatus = availabilityStatus;

    const { count, rows } = await Crew.findAndCountAll({
      where,
      include: [{ model: User, as: 'updater', attributes: ['id', 'firstName', 'lastName', 'username'] }],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows,
      pagination: { currentPage: parseInt(page), totalPages: Math.ceil(count / limit), totalRecords: count, hasNext: page * limit < count, hasPrev: page > 1 }
    });
  } catch (error) {
    console.error('getCrew error:', error);
    next(error);
  }
};
// @desc    Get single crew member
// @route   GET /api/crew/:id
// @access  Private (Admin/Government)
export const getCrewById = async (req, res, next) => {
  try {
    const crew = await Crew.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }
      ]
    });

    if (!crew) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CREW_NOT_FOUND',
          message: 'Crew member not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: { crew }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create crew member
// @route   POST /api/crew
// @access  Private (Admin only)


// @desc    Update crew member
// @route   PUT /api/crew/:id
// @access  Private (Admin only)
export const updateCrew = async (req, res, next) => {
  try {
    const crew = await Crew.findByPk(req.params.id);

    if (!crew) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CREW_NOT_FOUND',
          message: 'Crew member not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const oldValues = crew.toJSON();
    
    const {
      crewName,
      crewRole,
      availabilityStatus,
      statusDate,
      statusTime,
      notes
    } = req.body;

    await crew.update({
      crewName: crewName || crew.crewName,
      crewRole: crewRole || crew.crewRole,
      availabilityStatus: availabilityStatus || crew.availabilityStatus,
      statusDate: statusDate || crew.statusDate,
      statusTime: statusTime || crew.statusTime,
      notes: notes !== undefined ? notes : crew.notes,
      updatedBy: req.user.id
    });

    // Log audit
    await logAudit(
      'UPDATE',
      'crew',
      crew.id,
      oldValues,
      crew.toJSON(),
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    // Fetch updated record with associations
    const updatedCrew = await Crew.findByPk(crew.id, {
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
      data: updatedCrew
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete crew member
// @route   DELETE /api/crew/:id
// @access  Private (Admin only)
export const deleteCrew = async (req, res, next) => {
  try {
    const crew = await Crew.findByPk(req.params.id);

    if (!crew) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CREW_NOT_FOUND',
          message: 'Crew member not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const oldValues = crew.toJSON();

    await crew.destroy();

    // Log audit
    await logAudit(
      'DELETE',
      'crew',
      crew.id,
      oldValues,
      null,
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Crew member deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get crew statistics
// @route   GET /api/crew/stats
// @access  Private (Admin/Government)
export const getCrewStats = async (req, res, next) => {
  try {
    // Get counts by status
    const statusCounts = await Crew.findAll({
      attributes: [
        'availabilityStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['availabilityStatus'],
      raw: true
    });

    // Get counts by role
    const roleCounts = await Crew.findAll({
      attributes: [
        'crewRole',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['crewRole'],
      raw: true
    });

    // Get total count
    const totalCount = await Crew.count();

    // Get recent updates
    const recentUpdates = await Crew.findAll({
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
        roleBreakdown: roleCounts,
        recentUpdates
      }
    });
  } catch (error) {
    next(error);
  }
};