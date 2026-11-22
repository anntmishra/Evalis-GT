const asyncHandler = require('express-async-handler');
const { Teacher, Subject, Section, TeachingAssignment, Student, Batch, Semester, School, Department, UserRoleAssignment } = require('../models');
const XLSX = require('xlsx');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { recomputeTeacherRole } = require('../services/roleCacheService');
const { normalizeEmail, validateEmail, unguessableLocalSecret, recordPendingInvite, sendAccountInvitation } = require('../services/accountProvisioningService');

// Roles a teacher import row can seed a grant for, and the scope column each one needs.
const IMPORTABLE_ROLES = {
  hod: { scopeColumn: 'departmentId', scopeLabel: 'Department' },
  programme_coordinator: { scopeColumn: 'batchId', scopeLabel: 'Batch' },
  dean: { scopeColumn: 'schoolId', scopeLabel: 'School' },
  assistant_dean: { scopeColumn: 'schoolId', scopeLabel: 'School' },
  coe: { scopeColumn: null, scopeLabel: null },
};

/**
 * @desc    Get all teachers
 * @route   GET /api/teachers
 * @access  Private/Admin
 */
const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await Teacher.findAll({
    attributes: { exclude: ['password'] },
    include: [{
      model: TeachingAssignment,
      include: [{ model: Subject }]
    }]
  });
  res.json(teachers);
});

/**
 * @desc    Get teacher by ID
 * @route   GET /api/teachers/:id
 * @access  Private/Admin
 */
const getTeacherById = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ 
    where: { id: req.params.id },
    attributes: { exclude: ['password'] },
    include: [{
      model: TeachingAssignment,
      include: [{ model: Subject }]
    }]
  });

  if (teacher) {
    res.json(teacher);
  } else {
    res.status(404);
    throw new Error('Teacher not found');
  }
});

/**
 * @desc    Create a new teacher
 * @route   POST /api/teachers
 * @access  Private/Admin
 */
const createTeacher = asyncHandler(async (req, res) => {
  try {
    console.log('Teacher creation request received');
    console.log('Request body:', req.body);
    
    const { name, subjects, qualification, designation } = req.body;
    const email = normalizeEmail(req.body.email);
    let { id } = req.body;

    console.log('Extracted fields:', { id, name, email, subjectsLength: subjects?.length });

    // Validate required fields
    if (!name) {
      console.log('Missing required name field');
      return res.status(400).json({
        success: false,
        message: 'Please provide the teacher name'
      });
    }

    if (!email) {
      console.log('Missing required email field');
      return res.status(400).json({
        success: false,
        message: 'Please provide the teacher email'
      });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid teacher email' });
    }

    // Generate teacher ID if not provided
    if (!id) {
      id = await Teacher.generateTeacherId();
      console.log('Generated teacher ID:', id);
    }

    // Check if teacher already exists
    const teacherExists = await Teacher.findOne({ where: { id } });
    if (teacherExists) {
      console.log('Teacher already exists with id:', id);
      return res.status(400).json({
        success: false,
        message: 'Teacher already exists'
      });
    }

    // Check if email already exists
    const emailExists = await Teacher.findOne({ where: { email } });
    if (emailExists) {
      console.log('Email already in use:', email);
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    console.log('Creating teacher in database...');
    // Create the teacher
    const teacher = await Teacher.create({
      id,
      name,
      email,
      password: unguessableLocalSecret(),
      // Elevated authority is granted separately through scoped role assignments.
      role: 'teacher',
      qualification: qualification || null,
      designation: designation || null,
      tenantId: req.tenantId,
    });

    await recordPendingInvite({ email, role: 'teacher', tenantId: req.tenantId });
    const invitation = await sendAccountInvitation({ email, role: 'teacher', name });

    console.log('Teacher created successfully:', teacher.id);

    res.status(201).json({
      success: true,
      data: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        subjects: teacher.TeachingAssignments ? teacher.TeachingAssignments.map(ta => ta.Subject) : [],
        role: teacher.role,
        invitationSent: invitation.sent,
        invitationError: invitation.sent ? null : invitation.reason,
        message: invitation.sent ? 'Teacher created. An account setup invitation was emailed.' : `Teacher created, but the invitation was not sent: ${invitation.reason}`
      }
    });

  } catch (error) {
    console.error('Error in createTeacher:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({
        success: false,
        message: 'Teacher with this ID or email already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create teacher'
      });
    }
  }
});

/**
 * @desc    Update teacher
 * @route   PUT /api/teachers/:id
 * @access  Private/Admin
 */
const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!teacher) { res.status(404); throw new Error('Teacher not found'); }
  const nextEmail = req.body.email ? normalizeEmail(req.body.email) : teacher.email;
  if (!validateEmail(nextEmail)) { res.status(400); throw new Error('Please provide a valid teacher email'); }
  if (nextEmail !== teacher.email) {
    const duplicate = await Teacher.findOne({ where: { email: nextEmail } });
    if (duplicate && duplicate.id !== teacher.id) { res.status(409); throw new Error('Email already belongs to another teacher'); }
  }
  const emailChanged = nextEmail !== teacher.email;
  await teacher.update({
    name: req.body.name || teacher.name,
    email: nextEmail,
    qualification: req.body.qualification ?? teacher.qualification,
    designation: req.body.designation ?? teacher.designation,
  });
  let invitationSent = false;
  if (emailChanged) {
    teacher.clerkId = null;
    await teacher.save();
    await recordPendingInvite({ email: nextEmail, role: 'teacher', tenantId: req.tenantId });
    invitationSent = (await sendAccountInvitation({ email: nextEmail, role: 'teacher', name: teacher.name })).sent;
  }
  const result = await Teacher.findByPk(teacher.id, { attributes: { exclude: ['password'] }, include: [{ model: TeachingAssignment, include: [{ model: Subject }, { model: Section }] }] });
  res.json({ ...result.get(), invitationSent });
});

/**
 * @desc    Delete teacher
 * @route   DELETE /api/teachers/:id
 * @access  Private/Admin
 */
const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ where: { id: req.params.id } });

  if (teacher) {
    console.log(`Deleting teacher: ${teacher.id} (${teacher.name})`);
    
    // Delete from Clerk if clerkId exists
    if (teacher.clerkId) {
      try {
        const { clerkClient } = require('@clerk/express');
        await clerkClient.users.deleteUser(teacher.clerkId);
        console.log(`✅ Deleted Clerk user: ${teacher.clerkId} for teacher ${teacher.id}`);
      } catch (clerkError) {
        console.warn(`⚠️ Failed to delete Clerk user ${teacher.clerkId}: ${clerkError.message}`);
        // Continue with database deletion even if Clerk deletion fails
      }
    }
    
    // First delete all teaching assignments
    console.log(`Deleting teaching assignments for teacher ${teacher.id}`);
    await TeachingAssignment.destroy({ where: { teacherId: teacher.id } });
    
    // Then delete the teacher from database
    console.log(`Deleting teacher ${teacher.id} from database`);
    await teacher.destroy();
    
    console.log(`Teacher ${teacher.id} successfully deleted from system`);
    res.json({ 
      message: 'Teacher removed'
    });
  } else {
    res.status(404);
    throw new Error('Teacher not found');
  }
});

/**
 * @desc    Assign subject to teacher
 * @route   POST /api/teachers/:id/subjects
 * @access  Private/Admin
 */
const assignSubject = asyncHandler(async (req, res) => {
  const { subjectId, sectionId } = req.body;
  const sessionType = String(req.body.sessionType || 'lecture').toLowerCase();
  
  if (!subjectId || !sectionId || !['lecture', 'lab', 'tutorial'].includes(sessionType)) {
    res.status(400);
    throw new Error('Subject ID, section ID, and a valid session type are required');
  }
  
  const teacher = await Teacher.findOne({ where: { id: req.params.id } });
  
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }
  
  const subject = await Subject.findByPk(subjectId);
  
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }
  
  const section = await Section.findOne({ where: { id: sectionId, subjectId } });
  if (!section) { res.status(400); throw new Error('Section does not belong to the selected subject'); }

  const existingAssignment = await TeachingAssignment.findOne({
    where: {
      teacherId: teacher.id,
      subjectId: subject.id,
      sectionId,
      sessionType,
    }
  });
  
  if (existingAssignment) {
    if (!existingAssignment.isActive) await existingAssignment.update({ isActive: true, assignedBy: String(req.user.id) });
    return res.json(existingAssignment);
  }
  
  // Create the association
  await TeachingAssignment.create({
    teacherId: teacher.id,
    subjectId: subject.id,
    sectionId,
    sessionType,
    batchId: subject.batchId,
    semesterId: subject.semesterId,
    assignedBy: String(req.user.id),
  });
  
  // Get updated teacher with subjects
  const updatedTeacher = await Teacher.findOne({
    where: { id: teacher.id },
    attributes: { exclude: ['password'] },
    include: [{
      model: TeachingAssignment,
      include: [{ model: Subject }]
    }]
  });
  
  res.json(updatedTeacher);
});

/**
 * @desc    Remove subject from teacher
 * @route   DELETE /api/teachers/:id/subjects/:subjectId
 * @access  Private/Admin
 */
const removeSubject = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ where: { id: req.params.id } });
  
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }
  
  const subjectId = req.params.subjectId;
  const subject = await Subject.findByPk(subjectId);
  
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }
  
  // Check if teacher has this subject
  const assignment = await TeachingAssignment.findOne({
    where: {
      teacherId: teacher.id,
      subjectId: subject.id
    }
  });
  
  if (!assignment) {
    res.status(400);
    throw new Error('This subject is not assigned to this teacher');
  }
  
  // Revoke all active allocations for this teacher and subject. Section-specific
  // revocation uses DELETE /api/teaching-assignments/:id.
  await TeachingAssignment.update({ isActive: false }, { where: { teacherId: teacher.id, subjectId: subject.id } });
  
  // Get updated teacher with subjects
  const updatedTeacher = await Teacher.findOne({
    where: { id: teacher.id },
    attributes: { exclude: ['password'] },
    include: [{
      model: TeachingAssignment,
      include: [{ model: Subject }]
    }]
  });
  
  res.json(updatedTeacher);
});

/**
 * @desc    Import teachers from Excel file
 * @route   POST /api/teachers/import-excel
 * @access  Private/Admin
 */
const importTeachersFromExcel = asyncHandler(async (req, res) => {
  // Check if file is uploaded (multer populates req.file, not req.files)
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an Excel file');
  }

  const tenantId = req.tenantId;

  try {
    // Get the file buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Validate and prepare data
    const teachersToCreate = [];
    const teachersToUpdate = [];
    const roleGrantsToSeed = []; // [{ teacherId, role, scope }]
    const errors = [];

    // School/Department code lookups are cached -- a sheet with hundreds of rows from the
    // same department shouldn't issue hundreds of duplicate queries.
    const schoolCache = new Map();
    const resolveSchoolId = async (code) => {
      if (!code) return undefined;
      if (schoolCache.has(code)) return schoolCache.get(code);
      const found = await School.findOne({ where: { code } });
      schoolCache.set(code, found ? found.id : null);
      return schoolCache.get(code);
    };

    const departmentCache = new Map();
    const resolveDepartmentId = async (code) => {
      if (!code) return undefined;
      if (departmentCache.has(code)) return departmentCache.get(code);
      const found = await Department.findOne({ where: { code } });
      departmentCache.set(code, found ? found.id : null);
      return departmentCache.get(code);
    };

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];

      // Skip empty rows
      if (!row.TeacherID && !row.ID) {
        errors.push(`Row ${i + 2}: Missing required field (TeacherID/ID)`);
        continue;
      }

      if (!row.Name && !row.TeacherName) {
        errors.push(`Row ${i + 2}: Missing required field (Name/TeacherName)`);
        continue;
      }

      if (!row.Email && !row.TeacherEmail) {
        errors.push(`Row ${i + 2}: Missing required field (Email/TeacherEmail)`);
        continue;
      }

      // Get field values (handle different column naming conventions)
      const teacherId = (row.TeacherID || row.ID || '').toString().trim();
      const teacherName = (row.Name || row.TeacherName || '').toString().trim();
      const teacherEmail = (row.Email || row.TeacherEmail || '').toString().trim();
      const schoolCode = (row.School || row.SchoolCode || row.Affiliation || '').toString().trim();
      const roleRaw = (row.Role || '').toString().trim().toLowerCase();

      // Generate password (last 4 digits of ID)
      const defaultPassword = teacherId.slice(-4);

      // Create teacher object
      const teacherData = {
        id: teacherId,
        name: teacherName,
        email: teacherEmail,
        password: defaultPassword,
        role: 'teacher'
      };

      // Optional bulk role-grant seeding: a Role column (hod/programme_coordinator/dean/
      // assistant_dean/coe) plus whatever scope column that role needs (Department/Batch/
      // School code -- School also doubles as the row's general affiliation column).
      if (roleRaw && roleRaw !== 'teacher') {
        const roleSpec = IMPORTABLE_ROLES[roleRaw];
        if (!roleSpec) {
          errors.push(`Row ${i + 2}: Unknown role '${roleRaw}' -- expected one of ${Object.keys(IMPORTABLE_ROLES).join(', ')}`);
        } else if (roleSpec.scopeColumn === null) {
          roleGrantsToSeed.push({ teacherId, email: teacherEmail, role: roleRaw, scope: {} });
        } else if (roleSpec.scopeColumn === 'schoolId') {
          const schoolId = await resolveSchoolId(schoolCode);
          if (!schoolId) {
            errors.push(`Row ${i + 2}: ${roleSpec.scopeLabel} '${schoolCode}' not found for role '${roleRaw}'`);
          } else {
            roleGrantsToSeed.push({ teacherId, email: teacherEmail, role: roleRaw, scope: { schoolId } });
          }
        } else if (roleSpec.scopeColumn === 'departmentId') {
          const deptCode = (row.Department || row.DepartmentCode || '').toString().trim();
          const departmentId = await resolveDepartmentId(deptCode);
          if (!departmentId) {
            errors.push(`Row ${i + 2}: ${roleSpec.scopeLabel} '${deptCode}' not found for role '${roleRaw}'`);
          } else {
            roleGrantsToSeed.push({ teacherId, email: teacherEmail, role: roleRaw, scope: { departmentId } });
          }
        } else if (roleSpec.scopeColumn === 'batchId') {
          const batchId = (row.Batch || row.BatchId || row.BatchID || '').toString().trim();
          const batchExists = batchId ? await Batch.findByPk(batchId) : null;
          if (!batchExists) {
            errors.push(`Row ${i + 2}: ${roleSpec.scopeLabel} '${batchId}' not found for role '${roleRaw}'`);
          } else {
            roleGrantsToSeed.push({ teacherId, email: teacherEmail, role: roleRaw, scope: { batchId, departmentId: batchExists.departmentId } });
          }
        }
      }

      // Check if teacher already exists
      const existingTeacher = await Teacher.findOne({ where: { id: teacherData.id } });
      if (existingTeacher) {
        teachersToUpdate.push({
          id: teacherData.id,
          update: {
            name: teacherData.name,
            email: teacherData.email,
          }
        });
      } else {
        teachersToCreate.push(teacherData);
      }
    }

    // Create new teachers
    if (teachersToCreate.length > 0) {
      await Teacher.bulkCreate(teachersToCreate);
    }

    // Update existing teachers
    for (const teacher of teachersToUpdate) {
      await Teacher.update(
        teacher.update,
        { where: { id: teacher.id } }
      );
    }

    // Seed any requested role grants now that every teacher row has been created/updated
    let grantsSeeded = 0;
    for (const grant of roleGrantsToSeed) {
      try {
        await UserRoleAssignment.findOrCreate({
          where: { tenantId, teacherId: grant.teacherId, role: grant.role, status: 'active', ...grant.scope },
          defaults: {
            userId: (grant.email || grant.teacherId).toLowerCase(),
            grantedBy: req.user?.id || null,
            grantedAt: new Date()
          }
        });
        await recomputeTeacherRole(grant.teacherId, tenantId);
        grantsSeeded++;
      } catch (error) {
        console.error(`Error seeding role grant for teacher ${grant.teacherId}:`, error);
        errors.push(`Failed to seed '${grant.role}' grant for teacher ${grant.teacherId}: ${error.message}`);
      }
    }

    res.status(200).json({
      message: 'Teachers imported successfully',
      totalImported: teachersToCreate.length + teachersToUpdate.length,
      created: teachersToCreate.length,
      updated: teachersToUpdate.length,
      roleGrantsSeeded: grantsSeeded,
      errors: errors
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500);
    throw new Error('Error processing Excel file: ' + error.message);
  }
});

/**
 * @desc    Auth teacher & get token
 * @route   POST /api/teachers/login
 * @access  Public
 */
const authTeacher = asyncHandler(async (req, res) => {
  const { id, password } = req.body;

  const teacher = await Teacher.findOne({ 
    where: { id },
    include: [{
      model: Subject,
      through: { attributes: [] }
    }]
  });

  if (teacher && (await teacher.matchPassword(password))) {
    res.json({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      subjects: teacher.Subjects || [],
      role: teacher.role,
      token: generateToken(teacher.id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid ID or password');
  }
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

/**
 * @desc    Get students by teacher ID based on subjects taught
 * @route   GET /api/teachers/:id/students
 * @access  Private/Teacher
 */
const getStudentsByTeacher = asyncHandler(async (req, res) => {
  try {
    // Ensure all required models are available
    if (!Teacher || !Subject || !Student) {
      console.error('Required models not available', { 
        Teacher: !!Teacher, 
        Subject: !!Subject, 
        Student: !!Student,
        Batch: !!Batch 
      });
      res.status(500);
      throw new Error('Server configuration error - required models not available');
    }
    
    // Get the teacher ID from the request
    const teacherId = req.params.id;
    console.log(`Getting students for teacher ID: ${teacherId}`);
    
    // Verify the teacher exists
    const teacher = await Teacher.findByPk(teacherId, {
      include: [{
        model: Subject,
        through: { attributes: [] }
      }]
    });
    
    if (!teacher) {
      console.log(`Teacher with ID ${teacherId} not found`);
      res.status(404);
      throw new Error('Teacher not found');
    }

    console.log(`Found teacher: ${teacher.name}, with ${teacher.Subjects ? teacher.Subjects.length : 0} subjects`);

    // Check if the requesting user is the teacher or an admin
    if (req.user && req.user.role !== 'admin' && req.user.id !== teacherId) {
      console.log(`Unauthorized access attempt. User: ${req.user.id}, Role: ${req.user.role}, Requested: ${teacherId}`);
      res.status(403);
      throw new Error('Not authorized to access students for this teacher');
    }

    // Get all subject IDs taught by this teacher
    const subjectIds = teacher.Subjects ? teacher.Subjects.map(subject => subject.id) : [];
    console.log(`Subject IDs taught by teacher: ${subjectIds.join(', ') || 'None'}`);
    
    if (subjectIds.length === 0) {
      console.log('No subjects assigned to this teacher, returning empty array');
      return res.json([]);
    }

    // First, get all the teacher's subjects with their section details
    const teacherSubjects = await Subject.findAll({
      where: { id: { [Op.in]: subjectIds } },
      include: [
        Batch ? { model: Batch } : null,
        // Include semester so we can infer batch if subject has only semester linkage
        Semester ? { model: Semester, attributes: ['id','batchId'] } : null
      ].filter(Boolean)
    });

    console.log(`Found ${teacherSubjects.length} subjects with details`);
    teacherSubjects.forEach(subject => {
      console.log(`Subject ${subject.id}: ${subject.name}, Section: ${subject.section}`);
      if (subject.Batches) {
        console.log(`  Associated with batches: ${subject.Batches.map(b => b.id).join(', ')}`);
      }
      if (subject.Semester && subject.Semester.batchId) {
        console.log(`  Inferred batch from semester: ${subject.Semester.batchId}`);
      }
    });

    // Extract the unique sections taught by this teacher
    const taughtSections = [...new Set(teacherSubjects.map(subject => subject.section).filter(Boolean))];
    console.log(`Sections taught: ${taughtSections.join(', ') || 'None'}`);
    
    // Extract all batch IDs associated with the teacher's subjects
    const taughtBatches = new Set();
    teacherSubjects.forEach(subject => {
      if (subject.Batches && Array.isArray(subject.Batches) && subject.Batches.length > 0) {
        subject.Batches.forEach(batch => { if (batch && batch.id) taughtBatches.add(batch.id); });
      }
      // If no direct batch linkage but semester has batchId
      if ((!subject.Batches || subject.Batches.length === 0) && subject.Semester && subject.Semester.batchId) {
        taughtBatches.add(subject.Semester.batchId);
      }
      // Also fallback to legacy subject.batchId field
      if (subject.batchId) {
        taughtBatches.add(subject.batchId);
      }
    });
    const batchArray = [...taughtBatches];
    console.log(`Batches taught: ${batchArray.join(', ') || 'None'}`);

    if (taughtSections.length === 0 && batchArray.length === 0) {
      console.log('No sections or batches found, returning empty array');
      return res.json([]);
    }

    // Build the where clause based on what we have
    const whereClause = {};
    
    if (taughtSections.length > 0) {
      whereClause.section = {
        [Op.in]: taughtSections
      };
    }
    
    if (batchArray.length > 0) {
      whereClause.batch = {
        [Op.in]: batchArray
      };
    }
    
    // If we have both section and batch filters, use OR to include students from either
    const finalWhereClause = 
      taughtSections.length > 0 && batchArray.length > 0 
        ? { [Op.or]: [
            { section: { [Op.in]: taughtSections } },
            { batch: { [Op.in]: batchArray } }
          ]}
        : whereClause;

    // Now find students in those sections or batches
    let students = await Student.findAll({
      where: finalWhereClause,
      attributes: { exclude: ['password'] },
      order: [['id', 'ASC']]
    });

    // Fallback: if no students returned but we have taught batches, fetch by batch only.
    if (students.length === 0 && batchArray.length > 0) {
      console.log('Primary student search empty; applying batch-only fallback');
      students = await Student.findAll({
        where: { batch: { [Op.in]: batchArray } },
        attributes: { exclude: ['password'] },
        order: [['id', 'ASC']]
      });
    }

    console.log(`Found ${students.length} students`);

    // Get all batch ids
    const batchIds = [...new Set(students.map(s => s.batch).filter(Boolean))];
    console.log('Batch IDs found:', batchIds);

    // Get batch details if available
    let batches = [];
    try {
      if (batchIds.length > 0 && Batch) {
        batches = await Batch.findAll({
          where: {
            id: {
              [Op.in]: batchIds
            }
          }
        });
      }
      console.log(`Found ${batches.length} batches`);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }

    // Create a map of batch details for quick lookup
    const batchMap = batches.reduce((map, batch) => {
      map[batch.id] = batch;
      return map;
    }, {});

    // Process students with batch information
    const processedStudents = students.map(student => {
      const plainStudent = student.get({ plain: true });
      const batchId = plainStudent.batch;
      
      // Add batch information
      if (batchId) {
        const batchInfo = batchMap[batchId];
        if (batchInfo) {
          plainStudent.batchName = batchInfo.name;
        } else {
          plainStudent.batchName = `Batch ${batchId}`;
        }
      } else {
        // Assign default batch info if missing
        plainStudent.batch = 'default';
        plainStudent.batchName = 'Default Batch';
      }
      
      return plainStudent;
    });

    console.log('Processed students:', processedStudents.length);
    res.json(processedStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error while fetching students' });
  }
});

/**
 * @desc    Get current teacher's assigned subjects
 * @route   GET /api/teachers/subjects
 * @access  Private/Teacher
 */
const getTeacherSubjects = asyncHandler(async (req, res) => {
  try {
    // Check if user is logged in and has a valid ID
    if (!req.user || !req.user.id) {
      console.log('No valid user in request:', req.user);
      res.status(401);
      throw new Error('Not authenticated or invalid user');
    }
    
    // Get the logged-in teacher's ID from the JWT
    const teacherId = req.user.id;
    console.log(`Getting subjects for teacher ID: ${teacherId}`);
    
    // Find the teacher with their assigned subjects
    const teacher = await Teacher.findByPk(teacherId, {
      include: [{
        model: TeachingAssignment,
        include: [{ model: Subject }]
      }]
    });
    
    if (!teacher) {
      console.log(`Teacher with ID ${teacherId} not found`);
      res.status(404);
      throw new Error('Teacher not found');
    }
    
    console.log(`Found teacher: ${teacher.name}, with ${teacher.Subjects ? teacher.Subjects.length : 0} subjects`);
    
    // If teacher is found but has no subjects
    if (!teacher.Subjects || teacher.Subjects.length === 0) {
      console.log('Teacher found but has no assigned subjects');
    } else {
      console.log('Subjects:', teacher.Subjects.map(s => `${s.id}: ${s.name}`).join(', '));
    }
    
    // Return the teacher's subjects (even if empty array)
    res.json(teacher.TeachingAssignments ? teacher.TeachingAssignments.map(ta => ta.Subject) : []);
  } catch (error) {
    console.error('Error in getTeacherSubjects:', error);
    
    // If response has not been sent yet
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Server error fetching subjects',
        error: error.message
      });
    }
  }
});

/**
 * @desc    Create a test teacher account for development purposes
 * @route   POST /api/teachers/create-test-account
 * @access  Private/Admin
 */
const createTestTeacher = asyncHandler(async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      res.status(403);
      throw new Error('This endpoint is only available in development mode');
    }
    
    console.log('Creating test teacher account');
    
    // Use fixed data for test account
    const testData = {
      id: 'T0000',
      name: 'Test Teacher',
      email: req.body.email || 'teacher@test.com',
      password: 'password123', // Simple password for testing
      role: 'teacher'
    };
    
    console.log('Creating test account with email:', testData.email);
    
    // Check if test teacher already exists
    const existingTeacher = await Teacher.findOne({ 
      where: { 
        [Op.or]: [
          { id: testData.id },
          { email: testData.email }
        ]
      } 
    });
    
    if (existingTeacher) {
      // If exists, update the password
      existingTeacher.password = testData.password;
      await existingTeacher.save();
      
      console.log('Test teacher account updated');
      res.status(200).json({
        message: 'Test teacher account updated',
        id: existingTeacher.id,
        name: existingTeacher.name,
        email: existingTeacher.email,
        password: testData.password // Return password for testing purposes only
      });
    } else {
      // Create new test teacher
      const teacher = await Teacher.create(testData);
      
      console.log('Test teacher account created');
      res.status(201).json({
        message: 'Test teacher account created',
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        password: testData.password // Return password for testing purposes only
      });
    }
  } catch (error) {
    console.error('Error creating test teacher account:', error);
    if (!res.statusCode || res.statusCode === 200) {
      res.status(500);
    }
    throw error;
  }
});

/**
 * @desc    Get students accessible to a teacher
 * @route   GET /api/teachers/students
 * @access  Private/Teacher
 */
const getAccessibleStudents = asyncHandler(async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Find all subjects assigned to the teacher along with their batch information
    const teacherWithSubjects = await Teacher.findByPk(teacherId, {
      include: [{
        model: TeachingAssignment,
        include: [{
          model: Subject,
          include: [{ model: Batch }]
        }]
      }]
    });
    
    if (!teacherWithSubjects) {
      res.status(404);
      throw new Error('Teacher not found');
    }
    
    // Extract unique batch IDs from teacher's subjects
    const batchIds = [...new Set(
      (teacherWithSubjects.TeachingAssignments || [])
        .map(ta => ta.Subject?.batchId)
        .filter(id => id) // Filter out any undefined or null values
    )];
    
    if (batchIds.length === 0) {
      // Teacher has no assigned subjects with batches
      return res.json([]);
    }
    
    // Find all students from these batches
    const students = await Student.findAll({
      where: {
        batch: {
          [Op.in]: batchIds
        }
      },
      attributes: { exclude: ['password'] },
      include: [{
        model: Batch
      }]
    });
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching accessible students:', error);
    res.status(500).json({ message: 'Server error while fetching students' });
  }
});

/**
 * @desc    Get batches accessible to a teacher
 * @route   GET /api/teachers/batches
 * @access  Private/Teacher
 */
const getAccessibleBatches = asyncHandler(async (req, res) => {
  try {
    const teacherId = req.user.id;
    const debug = req.query.debug === '1';

    // Step 1: Fetch subject IDs from join table (authoritative for assignments)
    const teachingAssignments = await TeachingAssignment.findAll({
      where: { teacherId },
      attributes: ['subjectId']
    });
    const subjectIds = teachingAssignments.map(l => l.subjectId);

    if (subjectIds.length === 0) {
      if (debug) return res.json({ batches: [], debug: { subjectIds: [], note: 'No subject assignments for this teacher' } });
      return res.json([]);
    }

    // Step 2: Load subjects with minimal fields + Semester for batch linkage
    const subjects = await Subject.findAll({
      where: { id: { [Op.in]: subjectIds } },
      attributes: ['id','name','batchId','semesterId'],
      include: [ { model: Semester, attributes: ['id','batchId'] } ]
    });

    // Step 3: Derive batch IDs from multiple sources
    const batchIdSet = new Set();
    subjects.forEach(s => {
      if (s.batchId) batchIdSet.add(s.batchId);
      if (s.batch) batchIdSet.add(s.batch); // legacy
      if (s.Semester && s.Semester.batchId) batchIdSet.add(s.Semester.batchId);
    });

    // Step 4: Fallback raw query if still none (covers schema edge cases)
    if (batchIdSet.size === 0) {
      const [rows] = await sequelize.query(`
        SELECT DISTINCT COALESCE("Subjects"."batchId", "Semesters"."batchId") AS "batchId"
        FROM "TeachingAssignments"
        JOIN "Subjects" ON "Subjects"."id" = "TeachingAssignments"."subjectId"
        LEFT JOIN "Semesters" ON "Semesters"."id" = "Subjects"."semesterId"
        WHERE "TeachingAssignments"."teacherId" = :teacherId
      `, { replacements: { teacherId } });
      rows.forEach(r => r.batchId && batchIdSet.add(r.batchId));
    }

    const batchIds = [...batchIdSet];
    if (batchIds.length === 0) {
      if (debug) return res.json({ batches: [], debug: { subjectIds, subjects, note: 'No batchIds derivable from subjects/semesters' } });
      return res.json([]);
    }

    // Step 5: Fetch batch records
    const batches = await Batch.findAll({ where: { id: { [Op.in]: batchIds } } });
    const normalized = batches.map(b => ({ id: b.id, name: b.name || b.id, startYear: b.startYear, endYear: b.endYear }));

    if (debug) return res.json({ batches: normalized, debug: { subjectIds, subjects: subjects.map(s => ({ id: s.id, batchId: s.batchId, semesterId: s.semesterId, semesterBatch: s.Semester?.batchId })) } });

    res.json(normalized);
  } catch (error) {
    console.error('Error fetching accessible batches:', error);
    res.status(500).json({ message: 'Server error while fetching batches' });
  }
});

/**
 * @desc    Get teacher dashboard data
 * @route   GET /api/teachers/dashboard
 * @access  Private/Teacher
 */
const getTeacherDashboard = asyncHandler(async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Get teacher with subjects and their batches
    const teacher = await Teacher.findByPk(teacherId, {
      attributes: { exclude: ['password'] },
      include: [{
        model: TeachingAssignment,
        include: [{
          model: Subject,
          include: [{ model: Batch }]
        }]
      }]
    });
    
    if (!teacher) {
      res.status(404);
      throw new Error('Teacher not found');
    }
    
    // Extract all batch IDs from the teacher's subjects
    const batchIds = [...new Set(
      (teacher.TeachingAssignments || [])
        .map(ta => ta.Subject?.batchId)
        .filter(id => id)
    )];
    
    // Get students from these batches
    const studentsPromise = batchIds.length > 0 ? Student.findAll({
      where: { batch: { [Op.in]: batchIds } },
      attributes: { exclude: ['password'] },
      include: [{ model: Batch }]
    }) : Promise.resolve([]);
    
    // Get all submissions for the teacher's subjects
    const submissionsPromise = teacher.Subjects.length > 0 ? 
      Submission.findAll({
        where: { 
          subjectId: { 
            [Op.in]: teacher.Subjects.map(s => s.id) 
          } 
        },
        include: [
          { model: Student, attributes: { exclude: ['password'] } },
          { model: Subject }
        ]
      }) : Promise.resolve([]);
    
    // Wait for all promises to resolve
    const [students, submissions] = await Promise.all([studentsPromise, submissionsPromise]);
    
    // Organize students by batch
    const studentsByBatch = {};
    students.forEach(student => {
      const batchId = student.batch;
      if (!studentsByBatch[batchId]) {
        studentsByBatch[batchId] = [];
      }
      studentsByBatch[batchId].push(student);
    });
    
    // Organize submissions by subject
    const submissionsBySubject = {};
    submissions.forEach(submission => {
      const subjectId = submission.subjectId;
      if (!submissionsBySubject[subjectId]) {
        submissionsBySubject[subjectId] = [];
      }
      submissionsBySubject[subjectId].push(submission);
    });
    
    res.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email
      },
      subjects: teacher.Subjects,
      studentsByBatch,
      submissionsBySubject
    });
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard data' });
  }
});

module.exports = {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignSubject,
  removeSubject,
  importTeachersFromExcel,
  authTeacher,
  getStudentsByTeacher,
  getTeacherSubjects,
  createTestTeacher,
  getAccessibleStudents,
  getAccessibleBatches,
  getTeacherDashboard
}; 
