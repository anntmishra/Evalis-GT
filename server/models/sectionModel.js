const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Section = sequelize.define('Section', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g., Section A, Group 1'
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sectionGroupId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'The lecture group this section is combined into, if any (see SectionGroup)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  schema: 'academics',
  timestamps: true,
});

module.exports = Section;
