const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { DEFAULT_TENANT_ID } = require('../config/defaultTenant');

const Quiz = sequelize.define('Quiz', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  teacherId: {
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  subjectId: {
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  batchId: {
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  timeLimit: {
    type: DataTypes.INTEGER, // minutes
    allowNull: false,
    defaultValue: 60,
  },
  totalMarks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  passingMarks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  allowMultipleAttempts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  maxAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  shuffleQuestions: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  showResultsImmediately: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DEFAULT_TENANT_ID,
  }
}, {
  schema: 'examinations',
  timestamps: true
});

module.exports = Quiz;
