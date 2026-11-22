const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StudentSemesterEnrollment = sequelize.define('StudentSemesterEnrollment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'backlog', 'transferred_out', 'on_leave', 'graduated'),
    defaultValue: 'active',
  },
  enteredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  exitedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  schema: 'academics',
  timestamps: true,
});

// Records which section a student belongs to for a given semester offering -- required
// for HOD-by-section routing (a subject's HOD auto-split assigns sections, not individual
// students) and for resolving which lecture group a student's section rolls up into.
// Section membership can change mid-semester (a transfer), so this is an append-only log
// (isActive marks the current row) rather than a single mutable pointer, matching the
// StudentSemesterEnrollment pattern above.
const StudentSectionEnrollment = sequelize.define('StudentSectionEnrollment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sectionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  semesterId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  enteredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  exitedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  schema: 'academics',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'semesterId'],
      where: { isActive: true },
      name: 'student_section_enrollment_one_active_per_semester'
    }
  ]
});

module.exports = { StudentSemesterEnrollment, StudentSectionEnrollment };
