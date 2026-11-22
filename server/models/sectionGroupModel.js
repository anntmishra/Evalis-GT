const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// A SectionGroup is what multiple Sections combine into for a shared lecture (e.g. 4
// sections of 30 = one 120-student lecture group), while tutorials/labs stay per-Section.
// Not every program needs this (a small cohort with one section has no reason to create
// one) -- Section.sectionGroupId is nullable, so grouping is opt-in per batch/semester.
const SectionGroup = sequelize.define('SectionGroup', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g. "Lecture Group 1"'
  },
  batchId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  semesterId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  schema: 'academics',
  timestamps: true,
});

module.exports = SectionGroup;
