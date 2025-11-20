const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const QuizOption = sequelize.define('QuizOption', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'QuizQuestions',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  optionText: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  timestamps: true
});

module.exports = QuizOption;
