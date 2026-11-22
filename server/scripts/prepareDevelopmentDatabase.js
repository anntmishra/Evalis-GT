#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(root, '.env.neon.local'), override: true });
process.env.DB_USE_UNPOOLED = 'true';
process.env.DB_LOG_SQL = 'false';
const models = require('../models');
const { sequelize } = models;
const { BASELINED_MIGRATIONS, readRecoveryExport, restoreRecovery, seedDevelopment } = require('./lib/databaseSetup');
const schemas = ['users', 'academics', 'subjects', 'examinations', 'grading', 'results', 'notifications', 'administration'];

async function main() {
  const recovery = readRecoveryExport(path.join(__dirname, '../exports'));
  await sequelize.authenticate();
  const [existing] = await sequelize.query(
    `SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN (:schemas) OR (table_schema = 'public' AND table_name = 'SequelizeMigrations')`,
    { replacements: { schemas } }
  );
  console.log(JSON.stringify({ connection: 'direct', existingApplicationTables: existing.length, recoveryRows: recovery.metadata.totalRecords, recoveryDate: recovery.metadata.exportDate }));
  if (existing.length) throw new Error('Destination has application tables; refusing bootstrap');
  const migrations = fs.readdirSync(path.join(__dirname, '../migrations/versions')).filter(name => name.endsWith('.js')).sort();
  if (JSON.stringify(migrations) !== JSON.stringify([...BASELINED_MIGRATIONS].sort())) throw new Error('Migration inventory changed; review baseline before bootstrap');
  if (!process.argv.includes('--apply')) { console.log('Preflight passed. Use --apply to initialize this empty application schema.'); return; }
  const credentialDirectory = path.join(root, '.local-db');
  fs.mkdirSync(credentialDirectory, { recursive: true, mode: 0o700 });
  const credentialPath = path.join(credentialDirectory, 'development-logins.json');
  if (fs.existsSync(credentialPath)) throw new Error('Credential file already exists; refusing overwrite');
  const credentials = [];
  let wroteCredentials = false;
  let committed = false;
  try {
    await sequelize.transaction(async transaction => {
      await sequelize.query("SET LOCAL lock_timeout = '10s'", { transaction });
      await sequelize.query("SET LOCAL statement_timeout = '30s'", { transaction });
      await sequelize.query('SELECT pg_advisory_xact_lock(58410201)', { transaction });
      // Repeat under the lock; concurrent setup must not race the preflight.
      const [tables] = await sequelize.query('SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN (:schemas)', { replacements: { schemas }, transaction });
      if (tables.length) throw new Error('Destination changed during preflight');
      for (const schema of schemas) await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`, { transaction });
      console.log('Creating application tables inside one transaction...');
      await sequelize.sync({ transaction }); // Never force/alter: destination is empty.
      console.log('Restoring legacy export with password hooks disabled...');
      await restoreRecovery(models, recovery, transaction);
      console.log('Creating isolated development fixtures...');
      await seedDevelopment(models, transaction, credentials);
      // Current model snapshot already contains these historical structural changes.
      // Record the baseline explicitly instead of replaying ADD COLUMN migrations.
      await sequelize.query('CREATE TABLE public."SequelizeMigrations" (name VARCHAR(255) PRIMARY KEY NOT NULL)', { transaction });
      for (const name of BASELINED_MIGRATIONS) await sequelize.query('INSERT INTO public."SequelizeMigrations" (name) VALUES (:name)', { replacements: { name }, transaction });
      await sequelize.query('CREATE TABLE administration."DatabaseBootstrap" (id INTEGER PRIMARY KEY, details JSONB NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())', { transaction });
      await sequelize.query('INSERT INTO administration."DatabaseBootstrap" (id, details) VALUES (1, CAST(:details AS JSONB))', {
        replacements: { details: JSON.stringify({ baselineMigrations: BASELINED_MIGRATIONS, source: 'server/exports', sourceDate: recovery.metadata.exportDate, recoveredRecords: recovery.metadata.totalRecords, legacyTeacherSubjectMapping: 'TeachingAssignments.assignedBy contains the legacy ID', developmentAccounts: credentials.length }) }, transaction,
      });
      for (const model of Object.values(sequelize.models)) await model.count({ transaction });
      fs.writeFileSync(credentialPath, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      wroteCredentials = true;
    });
    committed = true;
    console.log(JSON.stringify({ ready: true, applicationModels: Object.keys(sequelize.models).length, recoveredRecords: recovery.metadata.totalRecords, developmentAccounts: credentials.length, credentialsFile: '.local-db/development-logins.json' }));
  } finally {
    if (!committed && wroteCredentials) fs.unlinkSync(credentialPath);
  }
}
main().catch(error => {
  console.error(JSON.stringify({ ready: false, error: error.name, code: error.original?.code, reason: error.original ? 'Database operation failed; transaction rolled back. SQL and record values omitted.' : error.message }));
  if (!error.original) console.error(error.stack?.split('\n').slice(1).join('\n'));
  process.exitCode = 1;
}).finally(() => sequelize.close());
