import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkOutTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  hoursWorked: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late'),
    defaultValue: 'present'
  },
  checkInLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  checkInLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  checkOutLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  checkOutLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'attendance',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'date']
    }
  ]
});

export default Attendance;