import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { logAudit } from '../middleware/audit.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Please provide username and password',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check for user
    const user = await User.findOne({ 
      where: { username },
      attributes: ['id', 'username', 'email', 'password', 'role', 'firstName', 'lastName', 'isActive']
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is inactive',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check password
    const isMatch = await user.validatePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Log audit
    await logAudit(
      'LOGIN',
      'users',
      user.id,
      null,
      { lastLogin: new Date() },
      user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    // Log audit
    await logAudit(
      'LOGOUT',
      'users',
      req.user.id,
      null,
      null,
      req.user.id,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify token
// @route   GET /api/auth/verify
// @access  Private
export const verifyToken = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          lastLogin: req.user.lastLogin
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Get user
      const user = await User.findByPk(decoded.id);
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid refresh token',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Generate new tokens
      const newToken = generateToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            lastLogin: user.lastLogin
          }
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token',
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    next(error);
  }
};