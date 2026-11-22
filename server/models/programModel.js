const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Program = sequelize.define('Program', {
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
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Denormalized top-level scope for quick filtering (e.g. the School picker in admin UI). Should agree with departmentId.School when both are set.'
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'The Department that offers this Program (e.g. CSE Department offers B.Tech in CSE). The real academic parent -- prefer this over schoolId for new hierarchy-aware code.'
  }
}, {
  schema: 'academics',
  timestamps: true,
});

module.exports = Program;
