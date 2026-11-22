#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const root = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(root, process.argv.includes('--candidate') ? '.env.neon.local' : '.env'), override: process.argv.includes('--candidate') });
const models = require('../models');
const { sequelize } = models;
const { readRecoveryExport, BASELINED_MIGRATIONS } = require('./lib/databaseSetup');

async function verify() {
  const recovery = readRecoveryExport(path.join(__dirname, '../exports'));
  const credentials = JSON.parse(fs.readFileSync(path.join(root, '.local-db/development-logins.json'), 'utf8'));
  const counts = {};
  await sequelize.transaction({ readOnly: true }, async transaction => {
    await sequelize.query("SET LOCAL statement_timeout = '10s'", { transaction });
    const [columns] = await sequelize.query('SELECT table_schema, table_name, column_name FROM information_schema.columns', { transaction });
    const columnKeys = new Set(columns.map(row => `${row.table_schema}.${row.table_name}.${row.column_name}`));
    for (const model of Object.values(sequelize.models)) {
      const table = model.getTableName();
      for (const [key, attribute] of Object.entries(model.rawAttributes)) {
        assert.ok(columnKeys.has(`${table.schema}.${table.tableName}.${attribute.field || key}`), `Missing column: ${model.name}.${key}`);
      }
      counts[model.name] = await model.count({ transaction });
    }
    for (const [table, name] of Object.entries({ Batches: 'Batch', Semesters: 'Semester', Subjects: 'Subject', Admins: 'Admin', Teachers: 'Teacher', Students: 'Student', Assignments: 'Assignment', Submissions: 'Submission' })) {
      for (const source of recovery.data[table]) {
        const row = await models[name].findByPk(source.id, { transaction });
        assert.ok(row, `Missing recovered row in ${table}`);
        for (const [key, value] of Object.entries(source)) {
          const actual = row.get(key);
          const equal = models[name].rawAttributes[key].type.key === 'DATE'
            ? new Date(actual).getTime() === new Date(value).getTime()
            : actual === value;
          assert.ok(equal, `Recovered field differs: ${table}.${key}`);
        }
      }
    }
    for (const source of recovery.data.TeacherSubjects) assert.equal(await models.TeachingAssignment.count({ where: { teacherId: source.teacherId, subjectId: source.subjectId, assignedBy: `legacy-TeacherSubjects:${source.id}` }, transaction }), 1);
    for (const account of credentials) {
      const Model = account.role === 'admin' ? models.Admin : account.role === 'student' ? models.Student : models.Teacher;
      const row = await Model.findByPk(account.id, { transaction });
      assert.ok(row && row.role === account.role, 'Development role mismatch');
      assert.ok(await bcrypt.compare(account.password, row.password), 'Development password verification failed');
      if (!['student', 'teacher', 'admin'].includes(account.role)) assert.equal(await models.UserRoleAssignment.count({ where: { teacherId: row.id, tenantId: row.tenantId, role: account.role, status: 'active' }, transaction }), 1);
    }
    const teacher = await models.Teacher.findByPk('DEV-TEACHER', { include: [models.Subject], transaction });
    assert.equal(teacher.Subjects.length, 1);
    const student = await models.Student.findByPk('DEV-STUDENT', { include: [{ model: models.Batch, include: [{ model: models.Program, include: [models.School, models.Department] }] }], transaction });
    assert.ok(student.Batch.Program.School && student.Batch.Program.Department, 'Missing academic hierarchy');
    assert.equal(await models.StudentSectionEnrollment.count({ where: { studentId: student.id, isActive: true }, transaction }), 1);
    assert.notEqual(student.tenantId, (await models.Tenant.findOne({ where: { name: 'Recovered Institution' }, transaction })).id);
    const [migrations] = await sequelize.query('SELECT name FROM public."SequelizeMigrations"', { transaction });
    for (const name of BASELINED_MIGRATIONS) assert.ok(migrations.some(row => row.name === name), 'Missing migration baseline');
    const [storage] = await sequelize.query('SELECT pg_database_size(current_database()) AS bytes', { transaction });
    console.log(JSON.stringify({ verified: true, recoveredRecords: recovery.metadata.totalRecords, testedDevelopmentAccounts: credentials.length, applicationModels: Object.keys(counts).length, databaseBytes: Number(storage[0].bytes), counts }, null, 2));
  });
}
verify().catch(error => { console.error(JSON.stringify({ verified: false, name: error.name, code: error.original?.code, reason: error.original ? 'Database verification query failed; record values omitted' : error.message })); process.exitCode = 1; }).finally(() => sequelize.close());
