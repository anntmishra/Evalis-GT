const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { DEFAULT_TENANT_ID } = require('../config/defaultTenant');

const RoleRequest = sequelize.define('RoleRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  proposerId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'ID of the Programme Coordinator proposing the role'
  },
  targetUserId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'ID of the Faculty member being proposed for the role'
  },
  requestedRole: {
    type: DataTypes.ENUM('hod'),
    allowNull: false,
  },
  assistantDeanStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    comment: 'Level 1 Approval'
  },
  deanStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    comment: 'Level 2 Final Approval'
  },
  assistantDeanId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID of the Assistant Dean who reviewed'
  },
  deanId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID of the Dean who reviewed'
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'The department this HOD will oversee'
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DEFAULT_TENANT_ID,
  }
}, {
  schema: 'administration',
  timestamps: true,
});

module.exports = RoleRequest;
