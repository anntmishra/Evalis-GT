const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const HandoutVote = sequelize.define('HandoutVote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  handoutId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  voterId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  vote: {
    type: DataTypes.ENUM('Approve', 'Reject'),
    allowNull: false,
  },
  comments: {
    type: DataTypes.TEXT,
  }
}, {
  schema: 'subjects',
  timestamps: true,
});

module.exports = HandoutVote;
