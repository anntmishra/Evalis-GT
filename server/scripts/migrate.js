#!/usr/bin/env node

// CLI runner for the umzug migration tool.
// Usage:
//   node scripts/migrate.js up            (run all pending migrations)
//   node scripts/migrate.js down          (revert the most recent migration)
//   node scripts/migrate.js status        (list pending/executed migrations)
//   node scripts/migrate.js create <name> (scaffold a new migration file)

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
if (process.env.DATABASE_URL_UNPOOLED) process.env.DB_USE_UNPOOLED = 'true';
const umzug = require('../config/migrator');

async function createMigration(name) {
  if (!name) {
    console.error('Usage: node scripts/migrate.js create <name>');
    process.exit(1);
  }
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const fileName = `${timestamp}-${slug}.js`;
  const filePath = path.join(__dirname, '..', 'migrations', 'versions', fileName);
  const template = `module.exports = {
  async up(queryInterface, Sequelize) {
    // TODO: implement forward migration
  },

  async down(queryInterface, Sequelize) {
    // TODO: implement rollback
  },
};
`;
  fs.writeFileSync(filePath, template);
  console.log(`Created migration: migrations/versions/${fileName}`);
}

async function main() {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case 'up': {
      const migrations = await umzug.up();
      console.log(`Applied ${migrations.length} migration(s):`, migrations.map((m) => m.name));
      break;
    }
    case 'down': {
      const migrations = await umzug.down();
      console.log(`Reverted:`, migrations.map((m) => m.name));
      break;
    }
    case 'status': {
      const pending = await umzug.pending();
      const executed = await umzug.executed();
      console.log('Executed:', executed.map((m) => m.name));
      console.log('Pending:', pending.map((m) => m.name));
      break;
    }
    case 'create': {
      await createMigration(args[0]);
      break;
    }
    default:
      console.error('Usage: node scripts/migrate.js <up|down|status|create> [name]');
      process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Migration command failed:', err);
  process.exit(1);
});
