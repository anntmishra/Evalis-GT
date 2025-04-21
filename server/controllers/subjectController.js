const asyncHandler = require('express-async-handler');
const { Subject, Teacher, TeacherSubject } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Get all subjects
 * @route   GET /api/subjects
 * @access  Private
 */
const getSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.findAll({
    include: [{
      model: Teacher,
      through: { attributes: [] }
    }]
  });
  res.json(subjects);
});

/**
 * @desc    Get subject by ID
 * @route   GET /api/subjects/:id
 * @access  Private
 */
const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await Subject.findByPk(req.params.id, {
    include: [{
      model: Teacher,
      through: { attributes: [] }
    }]
  });

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
  const { name, section, description, credits, id } = req.body;

  if (!name || !section) {
    res.status(400);
    throw new Error('Please provide name and section');
  }

  // Generate a subject ID if not provided
  const subjectId = id || `${section.replace('-', '')}${Math.floor(Math.random() * 1000)}`;

  // Check if subject already exists with the same ID
  const subjectExists = await Subject.findOne({ where: { id: subjectId } });

  if (subjectExists) {
    res.status(400);
    throw new Error('Subject with this ID already exists');
  }

  const subject = await Subject.create({
    id: subjectId,
    name,
    section,
    description: description || '',
    credits: credits || 3,
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
  const { name, section, description, credits } = req.body;

  const subject = await Subject.findByPk(req.params.id);

  if (subject) {
    subject.name = name || subject.name;
    subject.section = section || subject.section;
    subject.description = description !== undefined ? description : subject.description;
    subject.credits = credits !== undefined ? credits : subject.credits;

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
  const subject = await Subject.findByPk(req.params.id);

  if (subject) {
    // First remove all teacher-subject associations
    await TeacherSubject.destroy({
      where: { subjectId: subject.id }
    });
    
    // Then delete the subject
    await subject.destroy();
    res.json({ message: 'Subject removed' });
  } else {
    res.status(404);
    throw new Error('Subject not found');
  }
});

/**
 * @desc    Get subjects by section
 * @route   GET /api/subjects/section/:sectionId
 * @access  Private
 */
const getSubjectsBySection = asyncHandler(async (req, res) => {
  const subjects = await Subject.findAll({
    where: { section: req.params.sectionId },
    include: [{
      model: Teacher,
      through: { attributes: [] }
    }]
  });
  
  res.json(subjects);
});

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectsBySection
}; 