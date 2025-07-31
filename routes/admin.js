import express from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/index.js';
import { protect as auth } from '../middleware/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

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

export default router;