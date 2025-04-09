const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  batch: {
    type: String,
    required: true,
    ref: 'Batch'
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'student'
  }
}, {
  timestamps: true
});

// Method to check if entered password matches the stored hashed password
studentSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Pre-save hook to hash password
studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student; 