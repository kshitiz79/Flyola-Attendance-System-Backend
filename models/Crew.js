import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Crew = sequelize.define('Crew', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  crewName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100],
      notEmpty: true
    }
  },
  crewRole: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [1, 50],
      notEmpty: true
    }
  },
  availabilityStatus: {
    type: DataTypes.ENUM('available', 'unavailable', 'on_duty', 'off_duty'),
    allowNull: false,
    validate: {
      isIn: [['available', 'unavailable', 'on_duty', 'off_duty']]
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
  tableName: 'crew',
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

export default Crew;