const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GradeRevision = sequelize.define('GradeRevision', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  oldGrade: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  newGrade: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  changedBy: {
    type: DataTypes.STRING,
    allowNull: false, // Clerk userId or teacherId
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false, // e.g. "Re-evaluated due to grading error"
  }
}, {
  schema: 'results',
  timestamps: true, // createdAt will act as timestamp of change
});

module.exports = GradeRevision;
