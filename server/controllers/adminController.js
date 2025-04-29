const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const { 
  Admin, 
  Student, 
  Teacher, 
  Batch, 
  Subject, 
  TeacherSubject, 
  Semester 
} = require('../models');
const { createSemestersForBatch } = require('../utils/seedData');

/**
 * @desc    Add students in batch
 * @route   POST /api/admin/students/batch
 * @access  Private/Admin
 */
const addStudentsBatch = asyncHandler(async (req, res) => {
  const { students, batchId, semesterId } = req.body;

  if (!students || !Array.isArray(students) || students.length === 0) {
    res.status(400);
    throw new Error('Please provide a non-empty array of students');
  }

  if (!batchId) {
    res.status(400);
    throw new Error('Batch ID is required');
  }

  // Validate batch exists
  const batch = await Batch.findByPk(batchId);
  if (!batch) {
    res.status(404);
    throw new Error(`Batch with ID ${batchId} not found`);
  }

  // Validate semester if provided
  let semester = null;
  if (semesterId) {
    semester = await Semester.findByPk(semesterId);
    if (!semester) {
      res.status(404);
      throw new Error(`Semester with ID ${semesterId} not found`);
    }
    
    // Check if semester belongs to the specified batch
    if (semester.batchId !== batchId) {
      res.status(400);
      throw new Error(`Semester ${semesterId} does not belong to the specified batch ${batchId}`);
    }
    
    console.log(`Using semester ${semester.name} (${semesterId}) for new students`);
  } else {
    // Try to find the active semester for this batch
    const activeSemester = await Semester.findOne({
      where: {
        batchId,
        active: true
      },
      order: [['number', 'DESC']]
    });
    
    if (activeSemester) {
      semester = activeSemester;
      console.log(`Using active semester ${activeSemester.name} (${activeSemester.id}) for new students`);
    } else {
      console.log(`No active semester found for batch ${batchId}. Students will be created without a semester assignment.`);
    }
  }

  const createdStudents = [];
  const errors = [];

  // Create students in transaction
  for (const studentData of students) {
    try {
      const { id, name, section, email, password } = studentData;
      
      // Check if student already exists
      const existingStudent = await Student.findByPk(id);
      if (existingStudent) {
        errors.push({ id, error: 'Student with this ID already exists' });
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create student
      const student = await Student.create({
        id,
        name,
        section,
        batch: batchId,
        email,
        password: hashedPassword,
        activeSemesterId: semester ? semester.id : null
      });

      createdStudents.push({
        id: student.id,
        name: student.name,
        section: student.section,
        email: student.email,
        batch: student.batch,
        activeSemester: semester ? {
          id: semester.id,
          name: semester.name,
          number: semester.number
        } : null
      });
    } catch (error) {
      errors.push({ 
        id: studentData.id, 
        error: `Failed to create student: ${error.message}` 
      });
    }
  }

  res.status(201).json({
    success: true,
    count: createdStudents.length,
    data: createdStudents,
    errors: errors.length > 0 ? errors : undefined
  });
});

/**
 * @desc    Add teacher
 * @route   POST /api/admin/teachers
 * @access  Private/Admin
 */
const addTeacher = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validate inputs
  if (!name || !email) {
    res.status(400);
    throw new Error('Please provide name and email');
  }

  // Check if teacher with this email already exists
  const existingTeacher = await Teacher.findOne({ where: { email } });
  if (existingTeacher) {
    res.status(400);
    throw new Error('Teacher with this email already exists');
  }

  // Generate teacher ID
  const teacherId = await Teacher.generateTeacherId();
  
  // Generate password if not provided
  const teacherPassword = password || Teacher.generatePassword(teacherId);

  // Create teacher
  const teacher = await Teacher.create({
    id: teacherId,
    name,
    email,
    password: teacherPassword
  });

  res.status(201).json({
    success: true,
    data: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email
    }
  });
});

/**
 * @desc    Assign subject to teacher for a semester
 * @route   POST /api/admin/assign/subject
 * @access  Private/Admin
 */
const assignSubjectToTeacher = asyncHandler(async (req, res) => {
  const { teacherId, subjectId } = req.body;

  // Validate teacher exists
  const teacher = await Teacher.findByPk(teacherId);
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }

  // Validate subject exists with its semester information
  const subject = await Subject.findByPk(subjectId, {
    include: [
      {
        model: Semester,
        attributes: ['id', 'name', 'number']
      }
    ]
  });
  
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }

  // Log the subject assignment details
  console.log(`Assigning subject ${subject.name} (${subjectId}) to teacher ${teacher.name} (${teacherId})`);
  
  if (subject.Semester) {
    console.log(`Subject is part of semester: ${subject.Semester.name} (${subject.Semester.id})`);
  } else {
    console.log('Warning: Subject does not have an associated semester');
  }

  // Check if assignment already exists
  const existingAssignment = await TeacherSubject.findOne({
    where: {
      teacherId,
      subjectId
    }
  });

  if (existingAssignment) {
    res.status(400);
    throw new Error('Teacher is already assigned to this subject');
  }

  // Create teacher-subject assignment
  const assignment = await TeacherSubject.create({
    teacherId,
    subjectId
  });

  // Return comprehensive information about the assignment
  const assignmentDetails = {
    id: assignment.id,
    teacherId: assignment.teacherId,
    teacherName: teacher.name,
    subjectId: assignment.subjectId,
    subjectName: subject.name,
    subjectSection: subject.section,
    semester: subject.Semester ? {
      id: subject.Semester.id,
      name: subject.Semester.name,
      number: subject.Semester.number
    } : null,
    createdAt: assignment.createdAt
  };

  res.status(201).json({
    success: true,
    data: assignmentDetails
  });
});

/**
 * @desc    Get teacher-subject assignments
 * @route   GET /api/admin/assignments
 * @access  Private/Admin
 */
const getTeacherSubjectAssignments = asyncHandler(async (req, res) => {
  // Get all teacher-subject assignments with related teacher and subject details
  const assignments = await TeacherSubject.findAll({
    include: [
      {
        model: Teacher,
        attributes: ['id', 'name', 'email']
      },
      {
        model: Subject,
        include: [
          {
            model: Semester,
            attributes: ['id', 'name', 'number']
          }
        ]
      }
    ]
  });

  // Process the data to make it more frontend-friendly
  const processedAssignments = assignments.map(assignment => ({
    id: assignment.id,
    teacherId: assignment.teacherId,
    teacherName: assignment.Teacher ? assignment.Teacher.name : 'Unknown',
    teacherEmail: assignment.Teacher ? assignment.Teacher.email : '',
    subjectId: assignment.subjectId,
    subjectName: assignment.Subject ? assignment.Subject.name : 'Unknown',
    subjectSection: assignment.Subject ? assignment.Subject.section : '',
    semester: assignment.Subject && assignment.Subject.Semester ? {
      id: assignment.Subject.Semester.id,
      name: assignment.Subject.Semester.name,
      number: assignment.Subject.Semester.number
    } : null,
    createdAt: assignment.createdAt
  }));

  res.json({
    count: processedAssignments.length,
    assignments: processedAssignments
  });
});

/**
 * @desc    Generate semesters 1-8 for a batch
 * @route   POST /api/admin/semesters/generate/:batchId
 * @access  Private/Admin
 */
const generateSemestersForBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  
  // Call the utility function to create semesters
  const result = await createSemestersForBatch(batchId);
  
  if (!result.success) {
    res.status(400);
    throw new Error(result.message);
  }
  
  res.status(201).json(result);
});

/**
 * @desc    Set active semester for a student
 * @route   POST /api/admin/semesters/:semesterId/student/:studentId
 * @access  Private/Admin
 */
const setActiveSemesterForStudent = asyncHandler(async (req, res) => {
  const { semesterId, studentId } = req.params;
  
  // Validate semester exists
  const semester = await Semester.findByPk(semesterId);
  if (!semester) {
    res.status(404);
    throw new Error('Semester not found');
  }
  
  // Validate student exists
  const student = await Student.findByPk(studentId);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }
  
  // Check if student belongs to the batch that the semester belongs to
  if (student.batch !== semester.batchId) {
    res.status(400);
    throw new Error('Student does not belong to the batch of this semester');
  }
  
  // Update student's active semester
  student.activeSemesterId = semesterId;
  await student.save();
  
  res.json({
    success: true,
    message: `Active semester for student ${studentId} updated to ${semester.name}`,
    data: {
      studentId,
      studentName: student.name,
      semesterId,
      semesterName: semester.name,
      semesterNumber: semester.number
    }
  });
});

/**
 * @desc    Set active semester for all students in a batch
 * @route   POST /api/admin/semesters/:semesterId/batch/:batchId
 * @access  Private/Admin
 */
const setActiveSemesterForBatch = asyncHandler(async (req, res) => {
  const { semesterId, batchId } = req.params;
  
  // Validate semester exists
  const semester = await Semester.findByPk(semesterId);
  if (!semester) {
    res.status(404);
    throw new Error('Semester not found');
  }
  
  // Validate batch exists
  const batch = await Batch.findByPk(batchId);
  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }
  
  // Check if semester belongs to the batch
  if (semester.batchId !== batchId) {
    res.status(400);
    throw new Error('Semester does not belong to this batch');
  }
  
  // Get all students in the batch
  const students = await Student.findAll({
    where: { batch: batchId }
  });
  
  if (students.length === 0) {
    res.status(404);
    throw new Error('No students found in this batch');
  }
  
  // Update all students' active semester
  const updatedCount = await Student.update(
    { activeSemesterId: semesterId },
    { where: { batch: batchId } }
  );
  
  // Set this semester as active and others as inactive for this batch
  await Semester.update(
    { active: false },
    { where: { batchId } }
  );
  
  await Semester.update(
    { active: true },
    { where: { id: semesterId } }
  );
  
  res.json({
    success: true,
    message: `Active semester for ${updatedCount[0]} students in batch ${batch.name} updated to ${semester.name}`,
    data: {
      batchId,
      batchName: batch.name,
      semesterId,
      semesterName: semester.name,
      semesterNumber: semester.number,
      studentsUpdated: updatedCount[0]
    }
  });
});

module.exports = {
  addStudentsBatch,
  addTeacher,
  assignSubjectToTeacher,
  getTeacherSubjectAssignments,
  generateSemestersForBatch,
  setActiveSemesterForStudent,
  setActiveSemesterForBatch
}; 