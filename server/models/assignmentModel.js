const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Assignment = sequelize.define('Assignment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  subjectId: {
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  teacherId: {
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  examType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  requiresFileUpload: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  allowedFileTypes: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'JSON array of allowed file types like ["pdf", "doc", "docx"]'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  schema: 'grading',
  timestamps: true
});

module.exports = Assignment; 