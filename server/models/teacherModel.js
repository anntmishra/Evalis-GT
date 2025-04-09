const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  subjects: [{
    type: String,
    ref: 'Subject'
  }],
  role: {
    type: String,
    default: 'teacher'
  }
}, {
  timestamps: true
});

// Method to check if entered password matches the stored hashed password
teacherSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Pre-save hook to hash password
teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher; 