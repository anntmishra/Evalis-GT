/**
 * Creates one test login per portal so all wired dashboards (Faculty, Student,
 * COE, Master Admin) can be exercised with real, role-scoped data instead of
 * the dev auth bypass's fake admin.
 *
 * Non-destructive: only creates rows if they don't already exist (matched by
 * email), never touches existing data, no sequelize.sync({ force: true }).
 *
 * Usage: node server/scripts/seedTestLogins.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const { connectDB } = require('../config/db');
const { Admin, Teacher, Student, Batch } = require('../models');

const TEST_PASSWORD = process.env.EVALIS_TEST_PASSWORD;

const CREDENTIALS = [
  {
    label: 'Master Admin / COE',
    email: 'admin.test+clerk_test@evalis.test',
    doors: ['/master-admin/sign-in', '/coe/sign-in'],
    legacyLoginRoute: 'POST /api/auth/admin/login (username: admin_test)'
  },
  {
    label: 'Faculty',
    email: 'teacher.test+clerk_test@evalis.test',
    doors: ['/teacher/sign-in'],
    legacyLoginRoute: 'POST /api/auth/teacher/login (id: T900001)'
  },
  {
    label: 'Student',
    email: 'student.test+clerk_test@evalis.test',
    doors: ['/student/sign-in'],
    legacyLoginRoute: 'POST /api/auth/student/login (id: S900001)'
  }
];

// All log in via the Faculty door (/teacher/sign-in) -- FacultyPortal shows a different
// shell per Teacher.role (dean/assistant_dean/programme_coordinator/hod), so these are
// separate Teacher rows with the role pre-set, not a separate sign-in flow.
const TEACHER_SUBROLE_ACCOUNTS = [
  { id: 'T900002', email: 'hod.test+clerk_test@evalis.test', name: 'Test HOD', role: 'hod' },
  { id: 'T900003', email: 'dean.test+clerk_test@evalis.test', name: 'Test Dean', role: 'dean' },
  { id: 'T900004', email: 'asstdean.test+clerk_test@evalis.test', name: 'Test Assistant Dean', role: 'assistant_dean' },
  { id: 'T900005', email: 'coordinator.test+clerk_test@evalis.test', name: 'Test Coordinator', role: 'programme_coordinator' }
];

async function seed() {
  if (!TEST_PASSWORD || TEST_PASSWORD.length < 12) {
    throw new Error('Set EVALIS_TEST_PASSWORD to a unique password of at least 12 characters before seeding test accounts');
  }
  await connectDB();
  // Passed as plain text: each model's beforeSave hook hashes it automatically
  // when the password field is set/changed. Pre-hashing here would double-hash.

  const [admin, adminCreated] = await Admin.findOrCreate({
    where: { email: CREDENTIALS[0].email },
    defaults: {
      username: 'admin_test',
      name: 'Test Master Admin',
      email: CREDENTIALS[0].email,
      password: TEST_PASSWORD,
      role: 'admin'
    }
  });
  if (!adminCreated) {
    admin.password = TEST_PASSWORD;
    await admin.save();
  }

  const [teacher, teacherCreated] = await Teacher.findOrCreate({
    where: { email: CREDENTIALS[1].email },
    defaults: {
      id: 'T900001',
      name: 'Test Faculty',
      email: CREDENTIALS[1].email,
      password: TEST_PASSWORD,
      role: 'teacher'
    }
  });
  if (!teacherCreated) {
    teacher.password = TEST_PASSWORD;
    teacher.role = 'teacher'; // keep this one a plain teacher; use the dedicated accounts below for sub-roles
    await teacher.save();
  }

  const subroleResults = [];
  for (const acc of TEACHER_SUBROLE_ACCOUNTS) {
    const [row, created] = await Teacher.findOrCreate({
      where: { email: acc.email },
      defaults: { id: acc.id, name: acc.name, email: acc.email, password: TEST_PASSWORD, role: acc.role }
    });
    if (!created) {
      row.password = TEST_PASSWORD;
      row.role = acc.role;
      await row.save();
    }
    subroleResults.push({ ...acc, created });
  }

  const existingBatch = await Batch.findOne();

  const [student, studentCreated] = await Student.findOrCreate({
    where: { email: CREDENTIALS[2].email },
    defaults: {
      id: 'S900001',
      name: 'Test Student',
      email: CREDENTIALS[2].email,
      password: TEST_PASSWORD,
      role: 'student',
      section: 'CSE-1',
      batch: existingBatch ? existingBatch.id : 'TEST-BATCH'
    }
  });
  if (!studentCreated) {
    student.password = TEST_PASSWORD;
    await student.save();
  }

  console.log('\n=== Test logins ready ===\n');
  console.log(`Password for all accounts: ${TEST_PASSWORD}\n`);
  [
    [admin, adminCreated, CREDENTIALS[0]],
    [teacher, teacherCreated, CREDENTIALS[1]],
    [student, studentCreated, CREDENTIALS[2]]
  ].forEach(([row, created, meta]) => {
    console.log(`${meta.label}: ${meta.email} (${created ? 'created' : 'already existed'})`);
    console.log(`  Clerk sign-in doors: ${meta.doors.join(', ')} -- use OTP 424242 (test-mode email)`);
    console.log(`  Legacy password login: ${meta.legacyLoginRoute}\n`);
  });

  console.log('Faculty sub-roles (all log in at /teacher/sign-in, FacultyPortal shows the matching shell):');
  subroleResults.forEach(acc => {
    console.log(`  ${acc.role}: ${acc.email} (${acc.created ? 'created' : 'already existed'})`);
  });

  if (!existingBatch) {
    console.log('\nNote: no Batch rows exist yet, so the test student was seeded with a placeholder batch/section.');
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
