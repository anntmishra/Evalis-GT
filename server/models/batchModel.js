const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Batch = sequelize.define('Batch', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  endYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  durationInYears: {
    type: DataTypes.INTEGER,
    defaultValue: 4,
  },
  semestersPerYear: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Deprecated free-text department name, kept for display/back-compat. Use departmentId (derived from Program.departmentId) for joins.'
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'The Department this batch belongs to, via its Program. Authoritative link for role-scoping (e.g. programme_coordinator grants); the `department` string field is display-only.'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  schema: 'academics',
  timestamps: true
});

module.exports = Batch; 