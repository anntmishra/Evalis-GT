const asyncHandler = require('express-async-handler');
const XLSX = require('xlsx');
const { sequelize } = require('../config/db');
const {
  School, Department, Program, Batch, Semester, Subject,
  Student, Teacher, Section, TeachingAssignment,
} = require('../models');
const {
  normalizeEmail, validateEmail, unguessableLocalSecret,
  recordPendingInvite, sendAccountInvitation,
} = require('../services/accountProvisioningService');

const headerKey = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = value => String(value ?? '').trim();
const truthy = (value, fallback = true) => value === '' || value == null ? fallback : ['true', 'yes', '1', 'active'].includes(clean(value).toLowerCase());
const integer = value => Number.isInteger(Number(value)) ? Number(value) : null;

function normalizedRows(sheet) {
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true }).map(row =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [headerKey(key), value]))
  );
}
function sheetByName(workbook, names) {
  const wanted = names.map(headerKey);
  const actual = workbook.SheetNames.find(name => wanted.includes(headerKey(name)));
  return actual ? workbook.Sheets[actual] : null;
}
function pushError(errors, sheet, index, message) { errors.push(`${sheet} row ${index + 2}: ${message}`); }
function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function countResult(counts) { return Object.values(counts).reduce((sum, value) => sum + value, 0); }

async function processAcademicWorkbook({ buffer, originalname, mode = 'academic', tenantId, userId, batchId, validateOnly = false }) {
  if (!buffer) throw Object.assign(new Error('Select an .xlsx, .xls, or .csv file.'), { statusCode: 400 });
  if (!/\.(xlsx|xls|csv)$/i.test(originalname || '')) throw Object.assign(new Error('Unsupported file type. Use .xlsx, .xls, or .csv.'), { statusCode: 400 });
  let workbook;
  try { workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true }); }
  catch (error) { throw Object.assign(new Error(`The workbook could not be read: ${error.message}`), { statusCode: 400 }); }

  const selectedMode = clean(mode || 'academic').toLowerCase();
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = {
    schools: normalizedRows(selectedMode === 'academic' ? sheetByName(workbook, ['Schools']) : null),
    departments: normalizedRows(selectedMode === 'academic' ? sheetByName(workbook, ['Departments']) : null),
    programmes: normalizedRows(selectedMode === 'academic' ? sheetByName(workbook, ['Programmes', 'Programs']) : null),
    batches: normalizedRows(selectedMode === 'academic' ? sheetByName(workbook, ['Batches', 'Academic Sessions']) : null),
    semesters: normalizedRows(selectedMode === 'academic' ? sheetByName(workbook, ['Semesters']) : null),
    subjects: normalizedRows(selectedMode === 'academic' ? sheetByName(workbook, ['Subjects', 'Curriculum']) : null),
    students: normalizedRows(selectedMode === 'students' ? firstSheet : sheetByName(workbook, ['Students'])),
    teachers: normalizedRows(selectedMode === 'teachers' ? firstSheet : sheetByName(workbook, ['Teachers'])),
    assignments: normalizedRows(selectedMode === 'academic' ? sheetByName(workbook, ['Teaching Assignments', 'Assignments']) : null),
  };
  if (!Object.values(rows).some(items => items.length)) throw Object.assign(new Error('No import rows were found. Keep the supplied sheet names.'), { statusCode: 400 });

  const errors = [];
  const invitations = [];
  const counts = {
    schoolsCreated: 0, schoolsUpdated: 0, departmentsCreated: 0, departmentsUpdated: 0,
    programmesCreated: 0, programmesUpdated: 0, batchesCreated: 0, batchesUpdated: 0,
    semestersCreated: 0, semestersUpdated: 0, subjectsCreated: 0, subjectsUpdated: 0,
    studentsCreated: 0, studentsUpdated: 0, teachersCreated: 0, teachersUpdated: 0,
    assignmentsCreated: 0, assignmentsExisting: 0,
  };
  const transaction = await sequelize.transaction();
  try {
    const seen = { school: new Set(), department: new Set(), programme: new Set(), batch: new Set(), semester: new Set(), subject: new Set(), student: new Set(), teacher: new Set(), email: new Set() };

    for (let index = 0; index < rows.schools.length; index++) {
      const row = rows.schools[index], code = clean(row.schoolcode || row.code).toUpperCase(), name = clean(row.name || row.schoolname);
      if (!code || !name) { pushError(errors, 'Schools', index, 'School code and name are required.'); continue; }
      if (seen.school.has(code)) { pushError(errors, 'Schools', index, `Duplicate school code '${code}'.`); continue; } seen.school.add(code);
      const existing = await School.findOne({ where: { code }, transaction });
      if (existing && existing.tenantId !== tenantId) { pushError(errors, 'Schools', index, `School code '${code}' belongs to another institution.`); continue; }
      if (existing) { await existing.update({ name, description: clean(row.description), isActive: truthy(row.active) }, { transaction }); counts.schoolsUpdated++; }
      else { await School.create({ code, name, description: clean(row.description), isActive: truthy(row.active), tenantId }, { transaction }); counts.schoolsCreated++; }
    }

    for (let index = 0; index < rows.departments.length; index++) {
      const row = rows.departments[index], code = clean(row.departmentcode || row.code).toUpperCase(), name = clean(row.name || row.departmentname), schoolCode = clean(row.schoolcode).toUpperCase();
      if (!code || !name || !schoolCode) { pushError(errors, 'Departments', index, 'Department code, name, and school code are required.'); continue; }
      if (seen.department.has(code)) { pushError(errors, 'Departments', index, `Duplicate department code '${code}'.`); continue; } seen.department.add(code);
      const school = await School.findOne({ where: { code: schoolCode, tenantId }, transaction });
      if (!school) { pushError(errors, 'Departments', index, `School '${schoolCode}' does not exist in this institution or workbook.`); continue; }
      const existing = await Department.findOne({ where: { code }, transaction });
      if (existing && existing.schoolId !== school.id) { pushError(errors, 'Departments', index, `Department code '${code}' already belongs to another school.`); continue; }
      if (existing) { await existing.update({ name, description: clean(row.description), schoolId: school.id, isActive: truthy(row.active) }, { transaction }); counts.departmentsUpdated++; }
      else { await Department.create({ code, name, description: clean(row.description), schoolId: school.id, isActive: truthy(row.active) }, { transaction }); counts.departmentsCreated++; }
    }

    for (let index = 0; index < rows.programmes.length; index++) {
      const row = rows.programmes[index], code = clean(row.programmecode || row.programcode || row.code).toUpperCase(), name = clean(row.name || row.programmename || row.programname), departmentCode = clean(row.departmentcode).toUpperCase(), schoolCode = clean(row.schoolcode).toUpperCase();
      if (!code || !name || !departmentCode || !schoolCode) { pushError(errors, 'Programmes', index, 'Programme code, name, school code, and department code are required.'); continue; }
      if (seen.programme.has(code)) { pushError(errors, 'Programmes', index, `Duplicate programme code '${code}'.`); continue; } seen.programme.add(code);
      const school = await School.findOne({ where: { code: schoolCode, tenantId }, transaction });
      const department = school && await Department.findOne({ where: { code: departmentCode, schoolId: school.id }, transaction });
      if (!school || !department) { pushError(errors, 'Programmes', index, `Department '${departmentCode}' does not belong to school '${schoolCode}'.`); continue; }
      const existing = await Program.findOne({ where: { code }, transaction });
      if (existing && (existing.schoolId !== school.id || existing.departmentId !== department.id)) { pushError(errors, 'Programmes', index, `Programme code '${code}' already belongs to another school or department.`); continue; }
      if (existing) { await existing.update({ name, description: clean(row.description), schoolId: school.id, departmentId: department.id, isActive: truthy(row.active) }, { transaction }); counts.programmesUpdated++; }
      else { await Program.create({ code, name, description: clean(row.description), schoolId: school.id, departmentId: department.id, isActive: truthy(row.active) }, { transaction }); counts.programmesCreated++; }
    }

    for (let index = 0; index < rows.batches.length; index++) {
      const row = rows.batches[index], id = clean(row.batchid || row.id), name = clean(row.name || row.batchname), programmeCode = clean(row.programmecode || row.programcode).toUpperCase();
      const startYear = integer(row.startyear), duration = integer(row.durationyears) || 4, perYear = integer(row.semestersperyear) || 2;
      if (!id || !name || !programmeCode || !startYear) { pushError(errors, 'Batches', index, 'Batch ID, name, programme code, and start year are required.'); continue; }
      if (duration < 1 || perYear < 1 || duration * perYear > 12) { pushError(errors, 'Batches', index, 'Duration and semesters per year produce an invalid semester count.'); continue; }
      if (seen.batch.has(id)) { pushError(errors, 'Batches', index, `Duplicate batch ID '${id}'.`); continue; } seen.batch.add(id);
      const program = await Program.findOne({ where: { code: programmeCode }, transaction });
      if (!program) { pushError(errors, 'Batches', index, `Programme '${programmeCode}' does not exist.`); continue; }
      const school = await School.findOne({ where: { id: program.schoolId, tenantId }, transaction });
      if (!school) { pushError(errors, 'Batches', index, `Programme '${programmeCode}' is outside this institution.`); continue; }
      const values = { name, programId: program.id, departmentId: program.departmentId, department: clean(row.department) || program.name, startYear, endYear: startYear + duration, durationInYears: duration, semestersPerYear: perYear, active: truthy(row.active) };
      const existing = await Batch.findByPk(id, { transaction });
      if (existing && existing.programId && existing.programId !== program.id) { pushError(errors, 'Batches', index, `Batch ID '${id}' already belongs to another programme.`); continue; }
      if (existing) { await existing.update(values, { transaction }); counts.batchesUpdated++; }
      else { await Batch.create({ id, ...values }, { transaction }); counts.batchesCreated++; }
    }

    for (let index = 0; index < rows.semesters.length; index++) {
      const row = rows.semesters[index], batch = clean(row.batchid), number = integer(row.number || row.semesternumber), id = clean(row.semesterid || row.id) || `${batch}-SEM${number}`, name = clean(row.name || row.semestername);
      const startDate = parseDate(row.startdate), endDate = parseDate(row.enddate);
      if (!batch || !number || !name || !startDate || !endDate) { pushError(errors, 'Semesters', index, 'Batch ID, semester number, name, start date, and end date are required.'); continue; }
      if (number < 1 || number > 8 || endDate <= startDate) { pushError(errors, 'Semesters', index, 'Semester number must be 1-8 and the end date must be after the start date.'); continue; }
      if (seen.semester.has(id)) { pushError(errors, 'Semesters', index, `Duplicate semester ID '${id}'.`); continue; } seen.semester.add(id);
      const parent = await Batch.findByPk(batch, { transaction }); if (!parent) { pushError(errors, 'Semesters', index, `Batch '${batch}' does not exist.`); continue; }
      const conflicting = await Semester.findOne({ where: { batchId: batch, number }, transaction });
      const existing = await Semester.findByPk(id, { transaction });
      if (existing && existing.batchId !== batch) { pushError(errors, 'Semesters', index, `Semester ID '${id}' already belongs to another batch.`); continue; }
      if (conflicting && conflicting.id !== id) { pushError(errors, 'Semesters', index, `Batch '${batch}' already has semester number ${number} as '${conflicting.id}'.`); continue; }
      const values = { name, number, startDate, endDate, active: truthy(row.active, number === 1), batchId: batch };
      if (existing) { await existing.update(values, { transaction }); counts.semestersUpdated++; }
      else { await Semester.create({ id, ...values }, { transaction }); counts.semestersCreated++; }
    }

    for (let index = 0; index < rows.subjects.length; index++) {
      const row = rows.subjects[index], id = clean(row.subjectid || row.id || row.subjectcode), name = clean(row.name || row.subjectname), batch = clean(row.batchid), semesterId = clean(row.semesterid), section = clean(row.section || 'General'), credits = integer(row.credits);
      if (!id || !name || !batch || !semesterId || !section || credits == null) { pushError(errors, 'Subjects', index, 'Subject ID, name, batch ID, semester ID, section, and credits are required.'); continue; }
      if (credits < 0 || credits > 30) { pushError(errors, 'Subjects', index, 'Credits must be between 0 and 30.'); continue; }
      if (seen.subject.has(id)) { pushError(errors, 'Subjects', index, `Duplicate subject ID '${id}'.`); continue; } seen.subject.add(id);
      const semester = await Semester.findOne({ where: { id: semesterId, batchId: batch }, transaction });
      if (!semester) { pushError(errors, 'Subjects', index, `Semester '${semesterId}' does not belong to batch '${batch}'.`); continue; }
      const values = { name, batchId: batch, semesterId, section, credits, type: clean(row.type) || 'Core', description: clean(row.description) };
      const existing = await Subject.findByPk(id, { transaction });
      if (existing && existing.batchId && existing.batchId !== batch) { pushError(errors, 'Subjects', index, `Subject ID '${id}' already belongs to another batch.`); continue; }
      if (existing) { await existing.update(values, { transaction }); counts.subjectsUpdated++; }
      else { await Subject.create({ id, ...values }, { transaction }); counts.subjectsCreated++; }
    }

    for (let index = 0; index < rows.students.length; index++) {
      const row = rows.students[index], id = clean(row.studentid || row.id), name = clean(row.name || row.studentname), email = normalizeEmail(row.email || row.studentemail), studentBatch = clean(row.batchid || row.batch || batchId), section = clean(row.section);
      if (!id || !name || !email || !studentBatch || !section) { pushError(errors, 'Students', index, 'Student ID, name, email, batch ID, and section are required.'); continue; }
      if (!validateEmail(email)) { pushError(errors, 'Students', index, `Invalid email '${email}'.`); continue; }
      if (seen.student.has(id) || seen.email.has(email)) { pushError(errors, 'Students', index, `Duplicate student ID or email '${id}' / '${email}'.`); continue; } seen.student.add(id); seen.email.add(email);
      if (!(await Batch.findByPk(studentBatch, { transaction }))) { pushError(errors, 'Students', index, `Batch '${studentBatch}' does not exist.`); continue; }
      const emailOwner = await Student.findOne({ where: { email }, transaction }); if (emailOwner && emailOwner.id !== id) { pushError(errors, 'Students', index, `Email '${email}' already belongs to student '${emailOwner.id}'.`); continue; }
      const existing = await Student.findByPk(id, { transaction });
      if (existing && existing.tenantId !== tenantId) { pushError(errors, 'Students', index, 'Student ID belongs to another institution.'); continue; }
      if (existing) { await existing.update({ name, email, batch: studentBatch, section }, { transaction }); counts.studentsUpdated++; }
      else { await Student.create({ id, name, email, batch: studentBatch, section, tenantId, password: unguessableLocalSecret() }, { transaction }); await recordPendingInvite({ email, role: 'student', tenantId, scope: { batchId: studentBatch }, transaction }); invitations.push({ email, role: 'student', name }); counts.studentsCreated++; }
    }

    for (let index = 0; index < rows.teachers.length; index++) {
      const row = rows.teachers[index], id = clean(row.teacherid || row.id), name = clean(row.name || row.teachername), email = normalizeEmail(row.email || row.teacheremail);
      if (!id || !name || !email) { pushError(errors, 'Teachers', index, 'Teacher ID, name, and email are required.'); continue; }
      if (!validateEmail(email)) { pushError(errors, 'Teachers', index, `Invalid email '${email}'.`); continue; }
      if (seen.teacher.has(id) || seen.email.has(email)) { pushError(errors, 'Teachers', index, `Duplicate teacher ID or email '${id}' / '${email}'.`); continue; } seen.teacher.add(id); seen.email.add(email);
      const emailOwner = await Teacher.findOne({ where: { email }, transaction }); if (emailOwner && emailOwner.id !== id) { pushError(errors, 'Teachers', index, `Email '${email}' already belongs to teacher '${emailOwner.id}'.`); continue; }
      const existing = await Teacher.findByPk(id, { transaction });
      if (existing && existing.tenantId !== tenantId) { pushError(errors, 'Teachers', index, 'Teacher ID belongs to another institution.'); continue; }
      if (existing) { await existing.update({ name, email, qualification: clean(row.qualification) || existing.qualification, designation: clean(row.designation) || existing.designation }, { transaction }); counts.teachersUpdated++; }
      else { await Teacher.create({ id, name, email, qualification: clean(row.qualification) || null, designation: clean(row.designation) || null, role: 'teacher', tenantId, password: unguessableLocalSecret() }, { transaction }); await recordPendingInvite({ email, role: 'teacher', tenantId, transaction }); invitations.push({ email, role: 'teacher', name }); counts.teachersCreated++; }
    }

    for (let index = 0; index < rows.assignments.length; index++) {
      const row = rows.assignments[index], teacherId = clean(row.teacherid), subjectId = clean(row.subjectid || row.subjectcode), sectionName = clean(row.section || row.sectionname), sessionType = clean(row.sessiontype || 'lecture').toLowerCase();
      if (!teacherId || !subjectId || !sectionName) { pushError(errors, 'Teaching Assignments', index, 'Teacher ID, subject ID, and section are required.'); continue; }
      if (!['lecture', 'lab', 'tutorial'].includes(sessionType)) { pushError(errors, 'Teaching Assignments', index, 'Session type must be lecture, lab, or tutorial.'); continue; }
      const teacher = await Teacher.findOne({ where: { id: teacherId, tenantId }, transaction }), subject = await Subject.findByPk(subjectId, { transaction });
      if (!teacher) { pushError(errors, 'Teaching Assignments', index, `Teacher '${teacherId}' does not exist in this institution.`); continue; }
      if (!subject?.batchId) { pushError(errors, 'Teaching Assignments', index, `Subject '${subjectId}' does not exist or has no batch.`); continue; }
      const subjectBatch = await Batch.findByPk(subject.batchId, { transaction });
      const subjectProgram = subjectBatch && await Program.findByPk(subjectBatch.programId, { transaction });
      const subjectSchool = subjectProgram && await School.findOne({ where: { id: subjectProgram.schoolId, tenantId }, transaction });
      if (!subjectSchool) { pushError(errors, 'Teaching Assignments', index, `Subject '${subjectId}' is outside this institution.`); continue; }
      let section = await Section.findOne({ where: { subjectId, name: sectionName }, transaction });
      if (!section) section = await Section.create({ name: sectionName, subjectId, semesterId: subject.semesterId, capacity: integer(row.capacity) }, { transaction });
      const [assignment, created] = await TeachingAssignment.findOrCreate({ where: { teacherId, subjectId, sectionId: section.id, sessionType }, defaults: { batchId: subject.batchId, semesterId: subject.semesterId, assignedBy: String(userId), isActive: true }, transaction });
      if (!created && !assignment.isActive) await assignment.update({ isActive: true, assignedBy: String(userId) }, { transaction });
      created ? counts.assignmentsCreated++ : counts.assignmentsExisting++;
    }

    if (validateOnly || errors.length) await transaction.rollback(); else await transaction.commit();
  } catch (error) { if (!transaction.finished) await transaction.rollback(); throw error; }

  const invitationErrors = [];
  const rolledBack = validateOnly || errors.length > 0;
  if (!rolledBack) for (const invitation of invitations) { const result = await sendAccountInvitation(invitation); if (!result.sent) invitationErrors.push(`${invitation.email}: ${result.reason}`); }
  return { message: validateOnly ? (errors.length ? 'Validation completed with errors. Nothing was written.' : 'Validation passed. Nothing was written.') : (errors.length ? 'Import failed validation and was rolled back. Nothing was written.' : 'Import completed successfully.'), validationOnly: validateOnly, rolledBack, ...counts, totalImported: countResult(counts), invitationsSent: rolledBack ? 0 : invitations.length - invitationErrors.length, invitationErrors, errors };
}

async function importAcademicWorkbook(req, res) {
  const result = await processAcademicWorkbook({ buffer: req.file?.buffer, originalname: req.file?.originalname, mode: req.body.mode, tenantId: req.tenantId, userId: req.user.id, batchId: req.body.batchId, validateOnly: String(req.body.validateOnly || '').toLowerCase() === 'true' });
  res.json(result);
}

module.exports = { importAcademicWorkbook: asyncHandler(importAcademicWorkbook), processAcademicWorkbook };
