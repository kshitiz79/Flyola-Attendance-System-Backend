import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Aircraft = sequelize.define('Aircraft', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  aircraftId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      len: [1, 20],
      notEmpty: true
    }
  },
  aircraftType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [1, 50],
      notEmpty: true
    }
  },
  availabilityStatus: {
    type: DataTypes.ENUM('available', 'maintenance', 'in_use', 'grounded'),
    allowNull: false,
    validate: {
      isIn: [['available', 'maintenance', 'in_use', 'grounded']]
    }
  },
  statusDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      notEmpty: true
    }
  },
  statusTime: {
    type: DataTypes.TIME,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'aircraft',
  timestamps: true,
  indexes: [
    {
      fields: ['availabilityStatus']
    },
    {
      fields: ['statusDate']
    }
  ]
});

export default Aircraft;