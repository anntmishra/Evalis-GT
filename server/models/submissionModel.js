const mongoose = require('mongoose');

const submissionSchema = mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    ref: 'Student'
  },
  subjectId: {
    type: String,
    required: true,
    ref: 'Subject'
  },
  examType: {
    type: String,
    required: true
  },
  submissionText: {
    type: String,
    required: true
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  score: {
    type: Number,
    default: null
  },
  plagiarismScore: {
    type: Number,
    default: 0
  },
  feedback: {
    type: String,
    default: ''
  },
  graded: {
    type: Boolean,
    default: false
  },
  gradedBy: {
    type: String,
    ref: 'Teacher',
    default: null
  },
  gradedDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission; 