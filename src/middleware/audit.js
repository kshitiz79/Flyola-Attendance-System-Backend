import { AuditLog } from '../models/index.js';

// Audit middleware to log all data changes
export const auditLogger = (tableName) => {
  return async (req, res, next) => {
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Override res.send and res.json to capture response
    res.send = function(data) {
      res.locals.responseData = data;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      res.locals.responseData = data;
      return originalJson.call(this, data);
    };

    // Store request data for audit
    res.locals.auditData = {
      tableName,
      method: req.method,
      url: req.url,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    next();
  };
};

// Log audit entry after successful operation
export const logAudit = async (action, tableName, recordId, oldValues, newValues, userId, ipAddress, userAgent) => {
  try {
    await AuditLog.create({
      userId,
      action,
      tableName,
      recordId,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw error to avoid breaking the main operation
  }
};