import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Departure = sequelize.define('Departure', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  flightId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      len: [1, 20],
      notEmpty: true
    }
  },
  aircraftId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      len: [1, 20],
      notEmpty: true
    }
  },
  estimatedDeparture: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      notEmpty: true
    }
  },
  actualDeparture: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: true
    }
  },
  variance: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Variance in minutes'
  },
  departureDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      notEmpty: true
    }
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'departed', 'delayed', 'cancelled'),
    defaultValue: 'scheduled',
    validate: {
      isIn: [['scheduled', 'departed', 'delayed', 'cancelled']]
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recordedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'departures',
  timestamps: true,
  indexes: [
    {
      fields: ['departureDate']
    },
    {
      fields: ['flightId']
    }
  ],
  hooks: {
    beforeSave: (departure) => {
      // Calculate variance if both ETD and ATD are present
      if (departure.estimatedDeparture && departure.actualDeparture) {
        const etd = new Date(departure.estimatedDeparture);
        const atd = new Date(departure.actualDeparture);
        departure.variance = Math.round((atd - etd) / (1000 * 60)); // Convert to minutes
      }
    }
  }
});

export default Departure;