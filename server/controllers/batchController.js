const asyncHandler = require('express-async-handler');
const Batch = require('../models/batchModel');
const Student = require('../models/studentModel');

/**
 * @desc    Get all batches
 * @route   GET /api/batches
 * @access  Private/Admin, Teacher
 */
const getAllBatches = asyncHandler(async (req, res) => {
  const batches = await Batch.find({}).sort({ startYear: -1 });
  res.json(batches);
});

/**
 * @desc    Get batch by ID
 * @route   GET /api/batches/:id
 * @access  Private/Admin, Teacher
 */
const getBatchById = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  
  if (batch) {
    res.json(batch);
  } else {
    res.status(404);
    throw new Error('Batch not found');
  }
});

/**
 * @desc    Create a new batch
 * @route   POST /api/batches
 * @access  Private/Admin
 */
const createBatch = asyncHandler(async (req, res) => {
  const { name, department, startYear, endYear, active } = req.body;
  
  // Validate required fields
  if (!name || !department || !startYear || !endYear) {
    res.status(400);
    throw new Error('Please provide all required fields: name, department, startYear, endYear');
  }
  
  // Check if batch with same name already exists
  const batchExists = await Batch.findOne({ name });
  if (batchExists) {
    res.status(400);
    throw new Error('Batch with this name already exists');
  }
  
  // Validate years
  if (endYear <= startYear) {
    res.status(400);
    throw new Error('End year must be greater than start year');
  }
  
  // Generate batch ID (e.g., "BTech2024")
  const id = `${department.substring(0, 5)}${startYear}`;
  
  const batch = await Batch.create({
    id,
    name,
    department,
    startYear,
    endYear,
    active: active !== undefined ? active : true
  });
  
  if (batch) {
    res.status(201).json(batch);
  } else {
    res.status(400);
    throw new Error('Invalid batch data');
  }
});

/**
 * @desc    Update a batch
 * @route   PUT /api/batches/:id
 * @access  Private/Admin
 */
const updateBatch = asyncHandler(async (req, res) => {
  const { name, department, startYear, endYear, active } = req.body;
  
  const batch = await Batch.findById(req.params.id);
  
  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }
  
  // If name is being updated, check if it conflicts with another batch
  if (name && name !== batch.name) {
    const nameExists = await Batch.findOne({ name });
    if (nameExists) {
      res.status(400);
      throw new Error('Batch with this name already exists');
    }
  }
  
  // Update batch fields
  batch.name = name || batch.name;
  batch.department = department || batch.department;
  batch.startYear = startYear || batch.startYear;
  batch.endYear = endYear || batch.endYear;
  batch.active = active !== undefined ? active : batch.active;
  
  const updatedBatch = await batch.save();
  res.json(updatedBatch);
});

/**
 * @desc    Delete a batch
 * @route   DELETE /api/batches/:id
 * @access  Private/Admin
 */
const deleteBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  
  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }
  
  // TODO: Check if there are students or submissions associated with this batch
  // before deletion, or implement soft delete
  
  await batch.deleteOne();
  res.json({ message: 'Batch removed' });
});

/**
 * @desc    Get students in batch
 * @route   GET /api/batches/:id/students
 * @access  Private/Admin, Teacher
 */
const getBatchStudents = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const students = await Student.find({ batch: req.params.id }).select('-password');
  
  res.json(students);
});

module.exports = {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchStudents,
}; 