const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { DEFAULT_TENANT_ID } = require('../config/defaultTenant');

const StudentSubjectGrade = sequelize.define('StudentSubjectGrade', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  subjectId: {
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  semesterId: {
    type: DataTypes.STRING,
    allowNull: false,
    
  },
  gradeLetter: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g., O, A+, A, B+, B, C, F'
  },
  gradePoint: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'e.g., 10, 9, 8, 7, 6, 5, 0'
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Snapshot of the subject credits at the time of grading'
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DEFAULT_TENANT_ID,
  }
}, {
  schema: 'results',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'subjectId', 'semesterId']
    }
  ]
});

module.exports = StudentSubjectGrade;
