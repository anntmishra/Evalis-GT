const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Specialization = sequelize.define('Specialization', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  schema: 'subjects',
  timestamps: true,
});

module.exports = Specialization;
