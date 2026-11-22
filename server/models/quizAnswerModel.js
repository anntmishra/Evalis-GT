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
    
    onDelete: 'CASCADE'
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: false,
    
  },
  selectedOptionId: {
    type: DataTypes.UUID,
    allowNull: false,
    
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
  schema: 'grading',
  timestamps: true
});

module.exports = QuizAnswer;
