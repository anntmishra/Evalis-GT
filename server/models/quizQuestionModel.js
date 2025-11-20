const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const QuizQuestion = sequelize.define('QuizQuestion', {
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
  questionText: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  questionType: {
    type: DataTypes.ENUM('multiple_choice', 'true_false'),
    defaultValue: 'multiple_choice',
  },
  marks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  timestamps: true
});

module.exports = QuizQuestion;
