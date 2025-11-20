const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RedemptionHistory = sequelize.define('RedemptionHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userRole: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['student', 'teacher']]
    }
  },
  itemId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  itemName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tokenAmount: {
    type: DataTypes.STRING, // Store as string to handle large numbers
    allowNull: false,
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discountPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  redemptionCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'completed', 'claimed', 'expired', 'cancelled']]
    }
  },
  transactionHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  claimedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON, // Use JSON instead of JSONB for compatibility
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'redemption_history',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'userRole']
    },
    {
      fields: ['itemId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['redemptionCode']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = RedemptionHistory;
