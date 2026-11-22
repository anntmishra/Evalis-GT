const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'e.g. Indian Institute of Technology X'
  },
  subdomain: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'e.g. iitx'
  },
  clerkOrgId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Clerk Organization ID -- tenant resolution reads org_id straight off the session JWT and looks it up here'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  schema: 'administration',
  timestamps: true,
});

module.exports = Tenant;
