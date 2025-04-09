const asyncHandler = require('express-async-handler');
const Subject = require('../models/subjectModel');

/**
 * @desc    Get all subjects
 * @route   GET /api/subjects
 * @access  Private
 */
const getSubjects = asyncHandler(async (req, res) => {
  const section = req.query.section || null;
  
  const filter = {};
  if (section) filter.section = section;

  const subjects = await Subject.find(filter);
  res.json(subjects);
});

/**
 * @desc    Get subject by ID
 * @route   GET /api/subjects/:id
 * @access  Private
 */
const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await Subject.findOne({ id: req.params.id });

  if (subject) {
    res.json(subject);
  } else {
    res.status(404);
    throw new Error('Subject not found');
  }
});

/**
 * @desc    Create a new subject
 * @route   POST /api/subjects
 * @access  Private/Admin
 */
const createSubject = asyncHandler(async (req, res) => {
  const { id, name, section, description, credits } = req.body;

  const subjectExists = await Subject.findOne({ id });

  if (subjectExists) {
    res.status(400);
    throw new Error('Subject already exists');
  }

  const subject = await Subject.create({
    id,
    name,
    section,
    description,
    credits,
  });

  if (subject) {
    res.status(201).json(subject);
  } else {
    res.status(400);
    throw new Error('Invalid subject data');
  }
});

/**
 * @desc    Update subject
 * @route   PUT /api/subjects/:id
 * @access  Private/Admin
 */
const updateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findOne({ id: req.params.id });

  if (subject) {
    subject.name = req.body.name || subject.name;
    subject.section = req.body.section || subject.section;
    subject.description = req.body.description || subject.description;
    subject.credits = req.body.credits || subject.credits;

    const updatedSubject = await subject.save();
    res.json(updatedSubject);
  } else {
    res.status(404);
    throw new Error('Subject not found');
  }
});

/**
 * @desc    Delete subject
 * @route   DELETE /api/subjects/:id
 * @access  Private/Admin
 */
const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findOne({ id: req.params.id });

  if (subject) {
    await subject.deleteOne();
    res.json({ message: 'Subject removed' });
  } else {
    res.status(404);
    throw new Error('Subject not found');
  }
});

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
}; 