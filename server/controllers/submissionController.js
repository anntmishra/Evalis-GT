const asyncHandler = require('express-async-handler');
const { Submission, Student, Subject, Teacher, TeacherSubject, Assignment } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Get all submissions
 * @route   GET /api/submissions
 * @access  Private/Admin
 */
const getSubmissions = asyncHandler(async (req, res) => {
  const submissions = await Submission.findAll({
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

  // Check permissions:
  // 1. Admin can see all submissions
  // 2. Teacher can see submissions for their subjects
  // 3. Student can only see their own submissions
  const isAdmin = req.user.role === 'admin';
  const isTeacher = req.user.role === 'teacher';
  const isStudent = req.user.role === 'student';

  if (isAdmin) {
    // Admin can see all
    res.json(submission);
  } else if (isTeacher) {
    // Check if the subject is taught by this teacher
    const teachesSubject = await TeacherSubject.findOne({
      where: {
        teacherId: req.user.id,
        subjectId: submission.subjectId
      }
    });

    if (teachesSubject) {
      res.json(submission);
    } else {
      res.status(403);
      throw new Error('Not authorized to view this submission');
    }
  } else if (isStudent && submission.studentId === req.user.id) {
    // Student can see their own submission
    res.json(submission);
  } else {
    res.status(403);
    throw new Error('Not authorized to view this submission');
  }
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

  // If assignmentId is provided, verify it exists and matches the subject
  if (assignmentId) {
    const assignment = await Assignment.findByPk(assignmentId);
    
    if (!assignment) {
      res.status(404);
      throw new Error('Assignment not found');
    }
    
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
    gradedDate: null
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
  const { score, feedback, plagiarismScore } = req.body;

  const submission = await Submission.findByPk(req.params.id);

  if (!submission) {
    res.status(404);
    throw new Error('Submission not found');
  }

  // Check if the teacher is assigned to this subject
  if (req.user.role === 'teacher') {
    const teachesSubject = await TeacherSubject.findOne({
      where: {
        teacherId: req.user.id,
        subjectId: submission.subjectId
      }
    });

    if (!teachesSubject) {
      res.status(403);
      throw new Error('Not authorized to grade this submission');
    }
  }

  // Update fields
  submission.score = score !== undefined ? score : submission.score;
  submission.feedback = feedback !== undefined ? feedback : submission.feedback;
  submission.plagiarismScore = plagiarismScore !== undefined ? plagiarismScore : submission.plagiarismScore;

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

  res.json(fullSubmission);
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

  // Verify the subject exists
  const subject = await Subject.findByPk(subjectId);
  
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }

  // Check if teacher is assigned to this subject
  if (req.user.role === 'teacher') {
    const teachesSubject = await TeacherSubject.findOne({
      where: {
        teacherId: req.user.id,
        subjectId: subjectId
      }
    });

    if (!teachesSubject) {
      res.status(403);
      throw new Error('Not authorized to view submissions for this subject');
    }
  }

  const submissions = await Submission.findAll({
    where: { subjectId },
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
  const subjectIds = teacher.Subjects.map(subject => subject.id);
  
  if (subjectIds.length === 0) {
    return res.json([]);
  }

  // Find all submissions for these subjects
  const submissions = await Submission.findAll({
    where: {
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

  res.json(submissions);
});

/**
 * @desc    Submit an assignment solution
 * @route   POST /api/submissions/assignment/:id
 * @access  Private/Student
 */
const submitAssignment = asyncHandler(async (req, res) => {
  const assignmentId = req.params.id;
  const { submissionText, fileUrl } = req.body;

  // Verify the assignment exists
  const assignment = await Assignment.findByPk(assignmentId);
  
  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

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

  // Create submission
  const submission = await Submission.create({
    studentId: req.user.id,
    subjectId: assignment.subjectId,
    assignmentId,
    examType: assignment.examType,
    submissionText: submissionText || '',
    fileUrl: fileUrl || null,
    submissionDate: new Date(),
    score: null,
    plagiarismScore: 0,
    feedback: '',
    graded: false,
    gradedBy: null,
    gradedDate: null
  });

  if (submission) {
    res.status(201).json(submission);
  } else {
    res.status(400);
    throw new Error('Invalid submission data');
  }
});

module.exports = {
  getSubmissions,
  getSubmissionById,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getSubmissionsBySubject,
  getSubmissionsByTeacher,
  submitAssignment
}; 