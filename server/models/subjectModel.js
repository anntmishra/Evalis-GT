const mongoose = require('mongoose');

const subjectSchema = mongoose.Schema({
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
  description: {
    type: String,
    default: ''
  },
  credits: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject; 