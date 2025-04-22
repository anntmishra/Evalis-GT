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
  console.log('Comparing passwords:');
  console.log('- Entered password:', enteredPassword);
  console.log('- Stored hash:', this.password);
  const result = await bcrypt.compare(enteredPassword, this.password);
  console.log('- Match result:', result);
  return result;
};

// Static method to generate teacher ID
Teacher.generateTeacherId = async function() {
  try {
    // Find the latest teacher ID
    const latestTeacher = await this.findOne({
      order: [['createdAt', 'DESC']],
      where: {
        id: {
          [sequelize.Op.like]: 'T%'
        }
      }
    });

    let nextId = 'T0001';

    if (latestTeacher) {
      // Extract the numeric part and increment
      const currentId = latestTeacher.id;
      const numericPart = parseInt(currentId.substring(1), 10);
      nextId = 'T' + String(numericPart + 1).padStart(4, '0');
    }

    return nextId;
  } catch (error) {
    console.error('Error generating teacher ID:', error);
    return 'T0001'; // Fallback
  }
};

// Static method to generate email from name
Teacher.generateEmail = function(name, university = 'university.edu.in') {
  // Convert name to lowercase and remove spaces
  const formattedName = name.toLowerCase().replace(/\s+/g, '');
  return `${formattedName}@${university}`;
};

// Static method to generate default password
Teacher.generatePassword = function(teacherId) {
  // Password format: uni + numeric part of teacher ID
  return `uni${teacherId.substring(1)}`;
};

module.exports = Teacher; 