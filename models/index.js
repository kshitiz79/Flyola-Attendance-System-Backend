import sequelize from '../config/database.js';
import User from './User.js';
import Attendance from './Attendance.js';
import Aircraft from './Aircraft.js';
import Crew from './Crew.js';
import Departure from './Departure.js';
import Document from './Document.js';
import AuditLog from './AuditLog.js';

// Define associations
User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendanceRecords' });
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Aircraft, { foreignKey: 'updatedBy', as: 'aircraftUpdates' });
Aircraft.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

User.hasMany(Crew, { foreignKey: 'updatedBy', as: 'crewUpdates' });
Crew.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

User.hasMany(Departure, { foreignKey: 'recordedBy', as: 'departureRecords' });
Departure.belongsTo(User, { foreignKey: 'recordedBy', as: 'recorder' });

User.hasMany(Document, { foreignKey: 'uploadedBy', as: 'uploadedDocuments' });
Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  sequelize,
  User,
  Attendance,
  Aircraft,
  Crew,
  Departure,
  Document,
  AuditLog
};