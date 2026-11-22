const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const { DEFAULT_TENANT_ID } = require('../config/defaultTenant');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  section: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sectionGroupId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'The lecture group this student is in (see SectionGroup) -- distinct from `section`, which is the smaller tutorial/lab cohort'
  },
  batch: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  clerkId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'student',
  },
  specializationId: {
    type: DataTypes.UUID,
    allowNull: true, // Nullable until they choose a specialization
    
  },
  currentSemester: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  cgpa: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
  },
  activeSemesterId: {
    type: DataTypes.STRING,
    allowNull: true,

  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DEFAULT_TENANT_ID,
  }
}, {
  schema: 'users',
  timestamps: true,
  hooks: {
    beforeSave: async (student) => {
      // Only hash password if it has been modified (or is new)
      if (!student.changed('password')) {
        return;
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      student.password = await bcrypt.hash(student.password, salt);
    }
  }
});

// Instance method to check if entered password matches the stored hashed password
Student.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = Student; 