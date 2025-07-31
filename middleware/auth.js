import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Not authorized to access this route',
          timestamp: new Date().toISOString()
        }
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findByPk(decoded.id);
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive',
            timestamp: new Date().toISOString()
          }
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Not authorized to access this route',
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `User role ${req.user.role} is not authorized to access this route`,
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  };
};

// Admin only access
export const adminOnly = authorize('admin');

// Admin or Government access
export const adminOrGovernment = authorize('admin', 'government');