const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');

const Teacher = sequelize.define('Teacher', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'teacher',
  }
}, {
  timestamps: true,
  hooks: {
    beforeSave: async (teacher) => {
      // Only hash password if it has been modified (or is new)
      if (!teacher.changed('password')) {
        return;
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      teacher.password = await bcrypt.hash(teacher.password, salt);
    }
  }
});

// Instance method to check if entered password matches the stored hashed password
Teacher.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = Teacher; 