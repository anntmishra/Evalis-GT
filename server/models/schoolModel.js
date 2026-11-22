const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { DEFAULT_TENANT_ID } = require('../config/defaultTenant');

const School = sequelize.define('School', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
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
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DEFAULT_TENANT_ID,
  }
}, {
  schema: 'academics',
  timestamps: true,
});

module.exports = School;
