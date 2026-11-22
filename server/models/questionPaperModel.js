const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { DEFAULT_TENANT_ID } = require('../config/defaultTenant');

const QuestionPaper = sequelize.define('QuestionPaper', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  examType: { type: DataTypes.STRING, allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
  totalMarks: { type: DataTypes.INTEGER, allowNull: false },
  questions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  courseOutcomes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  status: {
    type: DataTypes.ENUM('draft', 'pending_hod', 'pending_coe', 'approved', 'changes_requested', 'rejected'),
    allowNull: false,
    defaultValue: 'draft',
  },
  submittedAt: { type: DataTypes.DATE, allowNull: true },
  reviewedAt: { type: DataTypes.DATE, allowNull: true },
  reviewHistory: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  tenantId: { type: DataTypes.UUID, allowNull: false, defaultValue: DEFAULT_TENANT_ID },
}, { schema: 'examinations', timestamps: true });

module.exports = QuestionPaper;
