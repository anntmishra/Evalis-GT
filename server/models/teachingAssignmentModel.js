const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TeachingAssignment = sequelize.define('TeachingAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sessionType: {
    type: DataTypes.ENUM('lecture', 'lab', 'tutorial'),
    allowNull: false,
    defaultValue: 'lecture',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  assignedBy: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User ID of the coordinator or dept admin who created this assignment'
  }
  // tenantId, teacherId, subjectId, sectionId, batchId, semesterId will be injected in index.js via associations
}, {
  schema: 'subjects',
  timestamps: true,
});

module.exports = TeachingAssignment;
