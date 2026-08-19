const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BiometricBaseline = sequelize.define('BiometricBaseline', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'Users', // Reference table name as a string to avoid circular require
      key: 'id'
    }
  },
  keystrokeBaseline: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Stores temporal flight times, dwell times, and error signatures from registration typing'
  },
  gestureBaseline: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Stores velocity vectors and spatial drag curves from registration swipes'
  },
  imuBaseline: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Stores acceleration and rotational gyro vectors from registration device holding'
  },
  isEnrolled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

module.exports = BiometricBaseline;