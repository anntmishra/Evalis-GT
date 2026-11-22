const asyncHandler = require('express-async-handler');
const { Submission, Student, Subject, Teacher, TeachingAssignment, Assignment, GradeRevision } = require('../models');
const { Op } = require('sequelize');
const { academicScope, requireSubject, requireTeacher, deny } = require('../utils/academicScope');
const { submissionView } = require('../utils/submissionView');
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
function validateScore(score) { if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) throw fail('Score must be a number between 0 and 100'); }
async function checkSubmission(req, row) {
  if (row.tenantId !== req.tenantId) throw deny();
  await requireSubject(req, row.subjectId);
  if (req.user.role === 'student' && row.studentId !== req.user.id) throw deny();
}

// Grade Scale System
const GRADE_SCALE = [
  { min: 100, max: 100, grade: 'O', gradePoint: 10.0 },
  { min: 90, max: 99, grade: 'A+', gradePoint: 9.0 },
  { min: 81, max: 89, grade: 'A', gradePoint: 8.0 },
  { min: 77, max: 80, grade: 'B+', gradePoint: 7.0 },
  { min: 66, max: 76, grade: 'B', gradePoint: 6.0 },
  { min: 55, max: 65, grade: 'C+', gradePoint: 5.0 },
  { min: 45, max: 54, grade: 'C', gradePoint: 4.0 },
  { min: 33, max: 44, grade: 'D', gradePoint: 3.0 },
  { min: 0, max: 32, grade: 'F', gradePoint: 0.0 }
];

// Helper functions for grade calculation
const calculateLetterGrade = (score) => {
  const grade = GRADE_SCALE.find(scale => score >= scale.min);
  return grade ? grade.grade : 'F';
};

const calculateGradePoints = (score) => {
  const grade = GRADE_SCALE.find(scale => score >= scale.min);
  return grade ? grade.gradePoint : 0.0;
};

/**
 * @desc    Get all submissions
 * @route   GET /api/submissions
 * @access  Private/Admin
 */
const getSubmissions = asyncHandler(async (req, res) => {
  const scope = await academicScope(req);
  const submissions = await Submission.findAll({
    where: { tenantId: req.tenantId, subjectId: { [Op.in]: scope.subjectIds } },
    include: [
      {
        model: Student,
        attributes: ['id', 'name', 'section', 'batch']
      },
      {
        model: Subject,
        attributes: ['id', 'name', 'section']
      },
      {
        model: Teacher,
        attributes: ['id', 'name']
      },
      {
        model: Assignment,
        attributes: ['id', 'title']
      }
    ],
    order: [['submissionDate', 'DESC']]
  });

  res.json(submissions);
});

/**
 * @desc    Get submission by ID
 * @route   GET /api/submissions/:id
 * @access  Private/Admin, Teacher or Student (own submission)
 */
const getSubmissionById = asyncHandler(async (req, res) => {
  const submission = await Submission.findByPk(req.params.id, {
    include: [
      {
        model: Student,
        attributes: ['id', 'name', 'section', 'batch']
      },
      {
        model: Subject,
        attributes: ['id', 'name', 'section']
      },
      {
        model: Teacher,
        attributes: ['id', 'name']
      },
      {
        model: Assignment,
        attributes: ['id', 'title', 'description', 'dueDate']
      }
    ]
  });

  if (!submission) {
    res.status(404);
    throw new Error('Submission not found');
  }

  await checkSubmission(req, submission);
  res.json(submissionView(submission, req.user.role));
});

/**
 * @desc    Create a new submission
 * @route   POST /api/submissions
 * @access  Private/Student
 */
const createSubmission = asyncHandler(async (req, res) => {
  const { subjectId, examType, submissionText, assignmentId, fileUrl } = req.body;

  if (!subjectId || !examType || !submissionText) {
    res.status(400);
    throw new Error('Please provide all required fields: subjectId, examType, submissionText');
  }

  await requireSubject(req, subjectId);

  // If assignmentId is provided, verify it exists and matches the subject
  if (assignmentId) {
    const assignment = await Assignment.findByPk(assignmentId);
    
    if (!assignment) {
      res.status(404);
      throw new Error('Assignment not found');
    }
    
    if (assignment.dueDate && new Date(assignment.dueDate) < new Date()) throw fail('The deadline has passed');
    if (await Submission.count({ where: { studentId: req.user.id, assignmentId } })) throw fail('Already submitted', 409);
    if (assignment.subjectId !== subjectId) {
      res.status(400);
      throw new Error('Assignment does not match the provided subject');
    }
  }

  // Confirm the subject exists
  const subject = await Subject.findByPk(subjectId);
  
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }

  const submission = await Submission.create({
    tenantId: req.tenantId,
    studentId: req.user.id,
    subjectId,
    assignmentId: assignmentId || null,
    examType,
    submissionText,
    fileUrl: fileUrl || null,
    submissionDate: new Date(),
    score: null,
    plagiarismScore: 0,
    feedback: '',
    graded: false,
    gradedBy: null,
    gradedDate: null,
    gradingState: 'submitted'
  });

  if (submission) {
    res.status(201).json(submission);
  } else {
    res.status(400);
    throw new Error('Invalid submission data');
  }
});

/**
 * @desc    Update submission (grade)
 * @route   PUT /api/submissions/:id
 * @access  Private/Teacher, Admin
 */
const updateSubmission = asyncHandler(async (req, res) => {
  const { score, feedback, plagiarismScore, gradingState, reason } = req.body;

  const submission = await Submission.findByPk(req.params.id);

  if (!submission) {
    res.status(404);
    throw new Error('Submission not found');
  }

  await checkSubmission(req, submission);
  if (score !== undefined) validateScore(score);
  if (gradingState !== undefined && !['draft', 'submitted'].includes(gradingState)) throw fail('Results must be published through the examination office');
  if (submission.gradingState === 'published') throw fail('Published results are locked. A controlled revision workflow is required.', 409);

  // Check for grade revisions on published grades
  if (submission.gradingState === 'published' && score !== undefined && score !== submission.score) {
    if (!reason) {
      res.status(400);
      throw new Error('A reason is required when modifying a published grade for the audit log.');
    }

    // Create audit log
    await GradeRevision.create({
      submissionId: submission.id,
      oldGrade: submission.score,
      newGrade: score,
      changedBy: req.user.id,
      reason: reason
    });
  }

  // Update fields
  submission.score = score !== undefined ? score : submission.score;
  submission.feedback = feedback !== undefined ? feedback : submission.feedback;
  submission.plagiarismScore = plagiarismScore !== undefined ? plagiarismScore : submission.plagiarismScore;

  if (gradingState !== undefined) {
    submission.gradingState = gradingState;
  }

  // Calculate letter grade if score is provided
  if (score !== undefined) {
    submission.letterGrade = calculateLetterGrade(score);
    submission.gradePoints = calculateGradePoints(score);
  }

  // If this is being graded for the first time
  if (!submission.graded && score !== undefined) {
    submission.graded = true;
    submission.gradedBy = req.user.id;
    submission.gradedDate = new Date();
  }

  const updatedSubmission = await submission.save();




  // Fetch the updated submission with associations for response
  const fullSubmission = await Submission.findByPk(updatedSubmission.id, {
    include: [
      {
        model: Student,
        attributes: ['id', 'name', 'section', 'batch']
      },
      {
        model: Subject,
        attributes: ['id', 'name', 'section']
      },
      {
        model: Teacher,
        attributes: ['id', 'name']
      },
      {
        model: Assignment,
        attributes: ['id', 'title']
      }
    ]
  });

  const value = fullSubmission.toJSON();
  const response = {
    submission: {
      ...value,
      student: value.Student || null,
      subject: value.Subject || null,
      teacher: value.Teacher || null,
      assignment: value.Assignment || null
    }
  };

  res.json(response);
});

/**
 * @desc    Delete submission
 * @route   DELETE /api/submissions/:id
 * @access  Private/Admin
 */
const deleteSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findByPk(req.params.id);

  if (!submission) {
    res.status(404);
    throw new Error('Submission not found');
  }

  // Only allow admin to delete submissions
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete submissions');
  }

  await checkSubmission(req, submission);
  await submission.destroy();
  res.json({ message: 'Submission removed' });
});

/**
 * @desc    Get submissions by subject
 * @route   GET /api/submissions/subject/:subjectId
 * @access  Private/Teacher, Admin
 */
const getSubmissionsBySubject = asyncHandler(async (req, res) => {
  const subjectId = req.params.subjectId;

  await requireSubject(req, subjectId);

  const submissions = await Submission.findAll({
    where: { subjectId, tenantId: req.tenantId },
    include: [
      {
        model: Student,
        attributes: ['id', 'name', 'section', 'batch']
      },
      {
        model: Subject,
        attributes: ['id', 'name', 'section']
      },
      {
        model: Teacher,
        attributes: ['id', 'name']
      },
      {
        model: Assignment,
        attributes: ['id', 'title']
      }
    ],
    order: [['submissionDate', 'DESC']]
  });

  res.json(submissions);
});

/**
 * @desc    Get submissions by teacher ID
 * @route   GET /api/submissions/teacher/:teacherId
 * @access  Private/Teacher, Admin
 */
const getSubmissionsByTeacher = asyncHandler(async (req, res) => {
  const teacherId = req.params.teacherId;
  await requireTeacher(req, teacherId);
  const scope = await academicScope(req);
  
  // Verify the teacher exists
  const teacher = await Teacher.findByPk(teacherId, {
    include: [{
      model: Subject,
      through: { attributes: [] }
    }]
  });
  
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }

  // Check if the requesting user is the teacher or an admin
  if (req.user.role !== 'admin' && req.user.id !== teacherId) {
    res.status(403);
    throw new Error('Not authorized to access submissions for this teacher');
  }

  // Get all subjects taught by this teacher
  const subjectIds = teacher.Subjects.map(subject => subject.id).filter(id => scope.subjectIds.includes(id));
  
  if (subjectIds.length === 0) {
    return res.json([]);
  }

  // Find all submissions for these subjects
  const submissions = await Submission.findAll({
    where: {
      tenantId: req.tenantId,
      subjectId: {
        [Op.in]: subjectIds
      }
    },
    include: [
      {
        model: Student,
        attributes: ['id', 'name', 'section', 'batch']
      },
      {
        model: Subject,
        attributes: ['id', 'name', 'section']
      },
      {
        model: Teacher,
        attributes: ['id', 'name']
      },
      {
        model: Assignment,
        attributes: ['id', 'title']
      }
    ],
    order: [['submissionDate', 'DESC']]
  });

  res.json(submissions.map(row => { const value = row.toJSON(); return { ...value, student: value.Student || null }; }));
});

/**
 * @desc    Submit an assignment solution
 * @route   POST /api/submissions/assignment/:id
 * @access  Private/Student
 */
const submitAssignment = asyncHandler(async (req, res) => {
  const assignmentId = req.params.id;
  const { submissionText } = req.body;

  console.log('Submit assignment request:', {
    assignmentId,
    submissionText: submissionText ? 'provided' : 'empty',
    file: req.file ? req.file.filename : 'no file'
  });

  // Verify the assignment exists
  const assignment = await Assignment.findByPk(assignmentId);
  
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  await requireSubject(req, assignment.subjectId);
  if (!req.file && !submissionText?.trim()) throw fail('Upload a file or enter an answer');

  // Check if due date has passed
  if (assignment.dueDate && new Date(assignment.dueDate) < new Date()) {
    res.status(400);
    throw new Error('The deadline for this assignment has passed');
  }

  // Check if student has already submitted this assignment
  const existingSubmission = await Submission.findOne({
    where: {
      assignmentId,
      studentId: req.user.id
    }
  });

  if (existingSubmission) {
    res.status(400);
    throw new Error('You have already submitted this assignment');
  }

  // Get file URL if file was uploaded
  const fileUrl = req.file ? `/uploads/submissions/${req.file.filename}` : null;

  // Create submission
  const submission = await Submission.create({
    tenantId: req.tenantId,
    studentId: req.user.id,
    subjectId: assignment.subjectId,
    assignmentId,
    examType: assignment.examType,
    submissionText: submissionText || '',
    fileUrl: fileUrl,
    submissionDate: new Date(),
    score: null,
    plagiarismScore: 0,
    feedback: '',
    graded: false,
    gradedBy: null,
    gradedDate: null,
    gradingState: 'submitted'
  });

  if (submission) {
    res.status(201).json(submission);
  } else {
    res.status(400);
    throw new Error('Invalid submission data');
  }
});

/**
 * @desc    Save annotated PDF for a submission
 * @route   POST /api/submissions/:id/annotated-pdf
 * @access  Private/Teacher
 */
const saveAnnotatedPDF = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { annotations, gradedPdfUrl, score } = req.body;

  const submission = await Submission.findByPk(id);

  if (!submission) {
    res.status(404);
    throw new Error('Submission not found');
  }

  await checkSubmission(req, submission);
  if (submission.gradingState === 'published') throw fail('Published results are locked', 409);
  if (score !== undefined && score !== null && score !== '') validateScore(Number(score));
  const updateData = {
    gradedFileUrl: gradedPdfUrl,
    annotations: JSON.stringify(annotations),
    gradedBy: req.user.id,
    gradedDate: new Date(),
    gradingState: 'submitted'
  };

  if (score !== undefined && score !== null && score !== '') {
    const scoreNum = Number(score);
    if (!isNaN(scoreNum)) {
      updateData.score = scoreNum;
      updateData.letterGrade = calculateLetterGrade(scoreNum);
      updateData.gradePoints = calculateGradePoints(scoreNum);
      updateData.graded = true;
    }
  }

  // Update submission with annotated PDF URL and annotations
  await submission.update(updateData);

  res.json({
    message: 'Annotated PDF saved successfully',
    submission: await Submission.findByPk(id, {
      include: [
        {
          model: Student,
          attributes: ['id', 'name', 'section', 'batch']
        },
        {
          model: Assignment,
          attributes: ['id', 'title', 'description']
        }
      ]
    })
  });
});

module.exports = {
  getSubmissions,
  getSubmissionById,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getSubmissionsBySubject,
  getSubmissionsByTeacher,
  submitAssignment,
  saveAnnotatedPDF
};
