const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CourseHandout = sequelize.define('CourseHandout', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  subjectId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  proposerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '',
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Pending Vote', 'Approved', 'Rejected'),
    defaultValue: 'Draft',
  }
}, {
  schema: 'subjects',
  timestamps: true,
});

module.exports = CourseHandout;
