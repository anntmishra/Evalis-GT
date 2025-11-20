const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Timetable = sequelize.define('Timetable', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  semesterId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  batchId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  generatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'published', 'completed', 'archived'),
    defaultValue: 'draft',
  },
  generationMethod: {
    type: DataTypes.STRING,
    defaultValue: 'gnn',
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  metrics: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  generatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  timestamps: true,
  tableName: 'Timetables',
  comment: 'Stores generated or manually created timetables for semesters/batches',
});

module.exports = Timetable;
