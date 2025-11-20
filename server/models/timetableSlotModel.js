const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TimetableSlot = sequelize.define('TimetableSlot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  timetableId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Timetables',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  semesterId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Semesters',
      key: 'id',
    }
  },
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  dayName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slotIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  subjectId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Subjects',
      key: 'id',
    }
  },
  teacherId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Teachers',
      key: 'id',
    }
  },
  section: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  room: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sessionLabel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  info: {
    type: DataTypes.JSONB,
    defaultValue: {},
  }
}, {
  timestamps: true,
  tableName: 'TimetableSlots',
  indexes: [
    {
      fields: ['timetableId', 'dayOfWeek', 'slotIndex'],
      unique: true,
      name: 'TimetableSlots_unique_slot_per_day',
    },
    {
      fields: ['subjectId', 'teacherId', 'dayOfWeek', 'slotIndex'],
      name: 'TimetableSlots_lookup_idx',
    }
  ],
});

module.exports = TimetableSlot;
