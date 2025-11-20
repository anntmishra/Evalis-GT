const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const QuizAttempt = sequelize.define('QuizAttempt', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  quizId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Quizzes',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Students',
      key: 'id'
    }
  },
  attemptNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  totalMarks: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  passed: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  timeSpent: {
    type: DataTypes.INTEGER, // seconds
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'submitted', 'expired'),
    defaultValue: 'in_progress',
  }
}, {
  timestamps: true
});

module.exports = QuizAttempt;
