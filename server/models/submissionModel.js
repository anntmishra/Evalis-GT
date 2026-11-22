const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { DEFAULT_TENANT_ID } = require('../config/defaultTenant');

const Submission = sequelize.define('Submission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  subjectId: {
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  assignmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    
  },
  examType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  submissionText: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  submissionDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  letterGrade: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  gradePoints: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  gradingState: {
    type: DataTypes.ENUM('draft', 'submitted', 'published', 'disputed', 'resolved'),
    defaultValue: 'published',
    comment: 'Defaults to published for legacy submissions'
  },
  plagiarismScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  feedback: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  graded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  gradedBy: {
    type: DataTypes.STRING,
    allowNull: true,
    
  },
  gradedDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  gradedFileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  annotations: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DEFAULT_TENANT_ID,
  }
}, {
  schema: 'results',
  timestamps: true
});

module.exports = Submission; 