const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { DEFAULT_TENANT_ID } = require('../config/defaultTenant');

const PendingInvite = sequelize.define('PendingInvite', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  intendedRole: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g., student, teacher, coordinator'
  },
  intendedScopeId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'JSON or specific ID mapping to a batch, department, etc.'
  },
  status: {
    type: DataTypes.ENUM('pending', 'claimed', 'expired'),
    defaultValue: 'pending'
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DEFAULT_TENANT_ID,
  }
}, {
  schema: 'notifications',
  timestamps: true,
});

module.exports = PendingInvite;
