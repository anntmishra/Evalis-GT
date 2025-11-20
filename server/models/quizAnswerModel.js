const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const QuizAnswer = sequelize.define('QuizAnswer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  attemptId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'QuizAttempts',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'QuizQuestions',
      key: 'id'
    }
  },
  selectedOptionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'QuizOptions',
      key: 'id'
    }
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  marksAwarded: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  }
}, {
  timestamps: true
});

module.exports = QuizAnswer;
