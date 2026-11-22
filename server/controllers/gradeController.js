const asyncHandler = require('express-async-handler');
const { Student, Subject, StudentSubjectGrade, Semester } = require('../models');

/**
 * @desc    Calculate SGPA for a student for a specific semester
 * @route   POST /api/grades/calculate-sgpa
 * @access  Private/Admin/Coordinator
 */
const calculateSGPA = asyncHandler(async (req, res) => {
  const { studentId, semesterId } = req.body;

  if (!studentId || !semesterId) {
    res.status(400);
    throw new Error('Please provide studentId and semesterId');
  }

  // Fetch all grades for the student in the semester
  const grades = await StudentSubjectGrade.findAll({
    where: { studentId, semesterId }
  });

  if (grades.length === 0) {
    res.status(404);
    throw new Error('No grades found for this student in the specified semester');
  }

  let totalCreditPoints = 0;
  let totalCredits = 0;

  grades.forEach(grade => {
    totalCreditPoints += (grade.gradePoint * grade.credits);
    totalCredits += grade.credits;
  });

  const sgpa = totalCredits > 0 ? (totalCreditPoints / totalCredits).toFixed(2) : 0;

  // Cache it in Student model if this is the current semester (or handle history appropriately)
  // For simplicity, we just return it here.
  
  res.json({
    studentId,
    semesterId,
    sgpa: parseFloat(sgpa),
    totalCredits,
    totalCreditPoints,
    grades
  });
});

module.exports = {
  calculateSGPA
};
