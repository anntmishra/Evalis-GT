const asyncHandler = require('express-async-handler');
const { Assignment, Teacher, Subject, Submission, Student } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Get all assignments
 * @route   GET /api/assignments
 * @access  Private/Admin
 */
const getAssignments = asyncHandler(async (req, res) => {
  const assignments = await Assignment.findAll({
    include: [
      {
        model: Teacher,
        attributes: ['id', 'name']
      },
      {
        model: Subject,
        attributes: ['id', 'name', 'section']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
  
  res.json(assignments);
});

/**
 * @desc    Get assignments for a student
 * @route   GET /api/assignments/student
 * @access  Private/Student
 */
const getStudentAssignments = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  
  // Get the student's section and batch info
  const student = await Student.findByPk(studentId);
  
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }
  
  // Get all subjects for this student's section
  const subjects = await Subject.findAll({
    where: {
      section: student.section,
      // You might want to add semester or other filters here
    }
  });
  
  if (!subjects.length) {
    return res.json([]);
  }
  
  const subjectIds = subjects.map(subject => subject.id);
  
  // Get all assignments for these subjects
  const assignments = await Assignment.findAll({
    where: {
      subjectId: {
        [Op.in]: subjectIds
      }
    },
    include: [
      {
        model: Teacher,
        attributes: ['id', 'name']
      },
      {
        model: Subject,
        attributes: ['id', 'name', 'section']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  // Check if student has already submitted for each assignment
  const assignmentsWithSubmitStatus = await Promise.all(assignments.map(async (assignment) => {
    const submission = await Submission.findOne({
      where: {
        assignmentId: assignment.id,
        studentId
      }
    });

    return {
      ...assignment.toJSON(),
      submitted: !!submission,
      submissionId: submission ? submission.id : null,
      grade: submission ? submission.score : null,
      graded: submission ? submission.graded : false
    };
  }));
  
  res.json(assignmentsWithSubmitStatus);
});

/**
 * @desc    Get teacher's assignments
 * @route   GET /api/assignments/teacher
 * @access  Private/Teacher
 */
const getTeacherAssignments = asyncHandler(async (req, res) => {
  const teacherId = req.user.id;
  
  const assignments = await Assignment.findAll({
    where: { teacherId },
    include: [
      {
        model: Subject,
        attributes: ['id', 'name', 'section']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
  
  res.json(assignments);
});

/**
 * @desc    Get assignment by ID
 * @route   GET /api/assignments/:id
 * @access  Private
 */
const getAssignmentById = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findByPk(req.params.id, {
    include: [
      {
        model: Teacher,
        attributes: ['id', 'name']
      },
      {
        model: Subject,
        attributes: ['id', 'name', 'section']
      }
    ]
  });

  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  // Check permissions based on role
  const isAdmin = req.user.role === 'admin';
  const isTeacher = req.user.role === 'teacher';
  const isStudent = req.user.role === 'student';
  
  if (isAdmin) {
    // Admin can see all assignments
    res.json(assignment);
  } else if (isTeacher) {
    // Teacher can see their own assignments or assignments for subjects they teach
    if (assignment.teacherId === req.user.id) {
      res.json(assignment);
    } else {
      res.status(403);
      throw new Error('Not authorized to view this assignment');
    }
  } else if (isStudent) {
    // Students can see assignments for their subjects
    const student = await Student.findByPk(req.user.id);
    
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }
    
    const subject = await Subject.findByPk(assignment.subjectId);
    
    if (subject && subject.section === student.section) {
      // Check if student has submitted this assignment
      const submission = await Submission.findOne({
        where: {
          assignmentId: assignment.id,
          studentId: req.user.id
        }
      });
      
      res.json({
        ...assignment.toJSON(),
        submitted: !!submission,
        submissionId: submission ? submission.id : null,
        grade: submission ? submission.score : null,
        graded: submission ? submission.graded : false
      });
    } else {
      res.status(403);
      throw new Error('Not authorized to view this assignment');
    }
  } else {
    res.status(403);
    throw new Error('Not authorized to view this assignment');
  }
});

/**
 * @desc    Create a new assignment
 * @route   POST /api/assignments
 * @access  Private/Teacher
 */
const createAssignment = asyncHandler(async (req, res) => {
  console.log('Creating assignment with data:', {
    ...req.body,
    fileUrl: req.body.fileUrl ? 'EXISTS' : 'NOT PROVIDED'
  });
  
  const { title, description, subjectId, examType, dueDate, fileUrl } = req.body;

  if (!title || !subjectId || !examType) {
    console.log('Missing required fields:', { title, subjectId, examType });
    res.status(400);
    throw new Error('Please provide title, subjectId, and examType');
  }

  try {
    // Check if the teacher is assigned to this subject
    const teachesSubject = await Subject.findOne({
      include: [
        {
          model: Teacher,
          where: { id: req.user.id },
          through: { attributes: [] }
        }
      ],
      where: { id: subjectId }
    });

    if (!teachesSubject) {
      console.log('Teacher not authorized for subject:', {
        teacherId: req.user.id,
        subjectId
      });
      res.status(403);
      throw new Error('Not authorized to create assignments for this subject');
    }

    console.log('Creating assignment in database with data:', {
      title,
      teacherId: req.user.id,
      subjectId,
      examType,
      dueDate: dueDate || null,
      fileUrl: fileUrl || null
    });

    const assignment = await Assignment.create({
      title,
      description: description || '',
      subjectId,
      teacherId: req.user.id,
      examType,
      dueDate: dueDate || null,
      fileUrl: fileUrl || null
    });

    if (assignment) {
      console.log('Assignment created successfully:', assignment.id);
      res.status(201).json(assignment);
    } else {
      console.error('Failed to create assignment, no error but no result');
      res.status(400);
      throw new Error('Invalid assignment data');
    }
  } catch (error) {
    console.error('Error creating assignment in database:', error);
    res.status(500);
    throw new Error(`Database error: ${error.message}`);
  }
});

/**
 * @desc    Update assignment
 * @route   PUT /api/assignments/:id
 * @access  Private/Teacher (who created it)
 */
const updateAssignment = asyncHandler(async (req, res) => {
  const { title, description, examType, dueDate, fileUrl } = req.body;

  const assignment = await Assignment.findByPk(req.params.id);

  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  // Check if the teacher owns this assignment
  if (assignment.teacherId !== req.user.id && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this assignment');
  }

  // Update fields
  assignment.title = title || assignment.title;
  assignment.description = description !== undefined ? description : assignment.description;
  assignment.examType = examType || assignment.examType;
  assignment.dueDate = dueDate !== undefined ? dueDate : assignment.dueDate;
  assignment.fileUrl = fileUrl !== undefined ? fileUrl : assignment.fileUrl;
  
  const updatedAssignment = await assignment.save();

  res.json(updatedAssignment);
});

/**
 * @desc    Delete assignment
 * @route   DELETE /api/assignments/:id
 * @access  Private/Teacher (who created it) or Admin
 */
const deleteAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findByPk(req.params.id);

  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  // Check permissions
  if (req.user.role !== 'admin' && assignment.teacherId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to delete this assignment');
  }

  await assignment.destroy();
  res.json({ message: 'Assignment removed' });
});

/**
 * @desc    Get submissions for an assignment
 * @route   GET /api/assignments/:id/submissions
 * @access  Private/Teacher (who created it) or Admin
 */
const getAssignmentSubmissions = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findByPk(req.params.id);

  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  // Check permissions
  if (req.user.role !== 'admin' && assignment.teacherId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to view submissions for this assignment');
  }

  const submissions = await Submission.findAll({
    where: { assignmentId: req.params.id },
    include: [
      {
        model: Student,
        attributes: ['id', 'name', 'section', 'batch']
      }
    ],
    order: [['submissionDate', 'DESC']]
  });

  res.json(submissions);
});

module.exports = {
  getAssignments,
  getStudentAssignments,
  getTeacherAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions
}; 