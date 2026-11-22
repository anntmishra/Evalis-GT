const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BASELINED_MIGRATIONS = [
  '20260719094235-phase1-role-tenant-foundation.js',
  '20260719101126-phase2-org-hierarchy-fixes.js',
  '20260719104611-phase3-section-groups.js',
  '20260719104844-phase3-student-section-group.js',
];
const EXPORT_TABLES = ['Batches', 'Semesters', 'Subjects', 'Admins', 'Teachers', 'Students', 'Assignments', 'Submissions', 'TeacherSubjects'];

function readRecoveryExport(directory) {
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'export_metadata.json'), 'utf8'));
  const data = {};
  if (Object.keys(metadata.tables).some(name => !EXPORT_TABLES.includes(name))) throw new Error('Unrecognized export table; review mapping first');
  for (const name of EXPORT_TABLES) {
    const rows = JSON.parse(fs.readFileSync(path.join(directory, `${name}.json`), 'utf8'));
    if (!Array.isArray(rows) || rows.length !== metadata.tables[name]) throw new Error(`Export count mismatch: ${name}`);
    if (rows.some(row => !row || row.id == null) || new Set(rows.map(row => String(row.id))).size !== rows.length) throw new Error(`Invalid or duplicate ID: ${name}`);
    data[name] = rows;
  }
  const total = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
  if (total !== metadata.totalRecords) throw new Error('Export total mismatch');
  for (const [table, field, target] of [
    ['Students', 'batch', 'Batches'], ['Students', 'activeSemesterId', 'Semesters'],
    ['Semesters', 'batchId', 'Batches'], ['Subjects', 'batchId', 'Batches'],
    ['Subjects', 'semesterId', 'Semesters'], ['TeacherSubjects', 'teacherId', 'Teachers'],
    ['TeacherSubjects', 'subjectId', 'Subjects'], ['Assignments', 'teacherId', 'Teachers'],
    ['Assignments', 'subjectId', 'Subjects'], ['Submissions', 'studentId', 'Students'],
    ['Submissions', 'subjectId', 'Subjects'], ['Submissions', 'assignmentId', 'Assignments'],
  ]) {
    const ids = new Set(data[target].map(row => String(row.id)));
    if (data[table].some(row => row[field] != null && !ids.has(String(row[field])))) throw new Error(`Unresolved export relationship: ${table}.${field}`);
  }
  for (const name of ['Admins', 'Students', 'Teachers']) {
    if (data[name].some(row => !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(row.password || ''))) throw new Error(`Expected bcrypt password hashes: ${name}`);
  }
  return { metadata, data };
}

async function restoreRecovery(models, recovery, transaction) {
  const { DEFAULT_TENANT_ID } = require('../../config/defaultTenant');
  await models.Tenant.create({ id: DEFAULT_TENANT_ID, name: 'Recovered Institution' }, { transaction });
  const mapping = { Batches: 'Batch', Semesters: 'Semester', Subjects: 'Subject', Admins: 'Admin', Teachers: 'Teacher', Students: 'Student', Assignments: 'Assignment', Submissions: 'Submission' };
  for (const [table, modelName] of Object.entries(mapping)) {
    const model = models[modelName];
    for (const row of recovery.data[table]) {
      // Import hashes verbatim. Normal model hooks would hash these hashes again.
      const record = await model.create(row, { transaction, hooks: false, silent: true });
      for (const [key, value] of Object.entries(row)) {
        if (!model.rawAttributes[key]) throw new Error(`Unmapped export column: ${table}.${key}`);
        const actual = record.get(key);
        const matches = model.rawAttributes[key].type.key === 'DATE'
          ? new Date(actual).getTime() === new Date(value).getTime()
          : actual === value;
        if (!matches) throw new Error(`Restore verification failed: ${table}.${key}`);
      }
    }
  }
  for (const link of recovery.data.TeacherSubjects) {
    const subject = recovery.data.Subjects.find(row => row.id === link.subjectId);
    await models.TeachingAssignment.create({
      id: crypto.randomUUID(), teacherId: link.teacherId, subjectId: link.subjectId,
      batchId: subject.batchId, semesterId: subject.semesterId,
      createdAt: link.createdAt, updatedAt: link.updatedAt,
      assignedBy: `legacy-TeacherSubjects:${link.id}`,
    }, { transaction });
  }
  // Imported integer IDs do not advance PostgreSQL's sequences automatically.
  for (const modelName of ['Admin', 'Assignment', 'Submission']) {
    const model = models[modelName];
    const table = models.sequelize.getQueryInterface().queryGenerator.quoteTable(model.getTableName());
    await models.sequelize.query(
      `SELECT setval(pg_get_serial_sequence(:table, 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), EXISTS(SELECT 1 FROM ${table}))`,
      { replacements: { table }, transaction }
    );
  }
}

async function seedDevelopment(models, transaction, credentials) {
  const tenant = await models.Tenant.create({ name: 'Evalis Development Fixtures' }, { transaction });
  const school = await models.School.create({ name: 'Development School', code: 'DEV-SCHOOL', tenantId: tenant.id }, { transaction });
  const department = await models.Department.create({ name: 'Development Computing', code: 'DEV-CS', schoolId: school.id }, { transaction });
  const program = await models.Program.create({ name: 'Development Computer Science', code: 'DEV-PROGRAM', schoolId: school.id, departmentId: department.id }, { transaction });
  const batch = await models.Batch.create({ id: 'DEV-BATCH', name: 'Development Batch', startYear: 2026, endYear: 2030, department: department.name, departmentId: department.id, programId: program.id }, { transaction });
  const semester = await models.Semester.create({ id: 'DEV-SEM-1', name: 'Development Semester 1', number: 1, startDate: '2026-07-01', endDate: '2026-12-31', batchId: batch.id }, { transaction });
  const subject = await models.Subject.create({ id: 'DEV-CS101', name: 'Development Programming', section: 'A', semesterId: semester.id, batchId: batch.id }, { transaction });
  const accounts = [];
  for (const role of ['admin', 'teacher', 'student', 'hod', 'programme_coordinator', 'assistant_dean', 'dean', 'coe']) {
    const password = crypto.randomBytes(24).toString('base64url');
    const email = `${role}@evalis.example.test`;
    const Model = role === 'admin' ? models.Admin : role === 'student' ? models.Student : models.Teacher;
    const row = await Model.create({
      ...(role === 'admin' ? { username: 'dev_admin' } : { id: `DEV-${role.toUpperCase()}` }),
      name: `Development ${role}`, email, password, role, tenantId: tenant.id,
      ...(role === 'student' ? { batch: batch.id, section: 'A', activeSemesterId: semester.id } : {}),
    }, { transaction });
    accounts.push(row);
    credentials.push({ role, email, id: row.id, username: row.username, password, loginEndpoint: `/api/auth/${role === 'admin' ? 'admin' : role === 'student' ? 'student' : 'teacher'}/login` });
    if (!['admin', 'teacher', 'student'].includes(role)) await models.UserRoleAssignment.create({
      userId: email, teacherId: row.id, tenantId: tenant.id, role, status: 'active', grantedBy: 'development-bootstrap', grantedAt: new Date(),
      ...(role === 'dean' || role === 'assistant_dean' ? { schoolId: school.id } : {}),
      ...(role === 'programme_coordinator' ? { batchId: batch.id, departmentId: department.id } : {}),
      ...(role === 'hod' ? { departmentId: department.id, subjectId: subject.id, semesterId: semester.id } : {}),
    }, { transaction });
  }
  const teacher = accounts.find(row => row.role === 'teacher');
  const student = accounts.find(row => row.role === 'student');
  const section = await models.Section.create({ name: 'A', subjectId: subject.id, semesterId: semester.id, teacherId: teacher.id }, { transaction });
  await models.TeachingAssignment.create({ teacherId: teacher.id, subjectId: subject.id, sectionId: section.id, batchId: batch.id, semesterId: semester.id }, { transaction });
  await models.StudentSemesterEnrollment.create({ studentId: student.id, batchId: batch.id, semesterId: semester.id }, { transaction });
  await models.StudentSectionEnrollment.create({ studentId: student.id, sectionId: section.id, semesterId: semester.id }, { transaction });
  await models.Assignment.create({ title: 'Development upload test', description: 'Synthetic assignment for testing submission and grading.', subjectId: subject.id, teacherId: teacher.id, examType: 'Assignment', requiresFileUpload: true, allowedFileTypes: '["pdf"]' }, { transaction });
}

module.exports = { BASELINED_MIGRATIONS, readRecoveryExport, restoreRecovery, seedDevelopment };
