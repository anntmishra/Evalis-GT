const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const { sequelize } = require('./db');

// Ordered, reversible migrations for structural DB changes.
// The legacy one-off scripts in server/migrations/ (fixQuizSchemas.js,
// add_annotated_pdf_fields.sql) predate this tool and are not managed by it;
// new structural changes go in server/migrations/versions/ as <timestamp>-<name>.js
// exporting { up(queryInterface, Sequelize), down(queryInterface, Sequelize) }.
const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '..', 'migrations', 'versions', '*.js'),
    resolve: ({ name, path: migrationPath, context }) => {
      const migration = require(migrationPath);
      return {
        name,
        up: async () => migration.up(context, sequelize.constructor),
        down: async () => {
          const [tables] = await sequelize.query(`SELECT to_regclass('administration."DatabaseBootstrap"') AS table_name`);
          if (tables[0].table_name) {
            const [rows] = await sequelize.query('SELECT details FROM administration."DatabaseBootstrap" WHERE id = 1');
            if (rows[0]?.details?.baselineMigrations?.includes(name)) {
              throw new Error('Cannot undo a migration included in the initial schema baseline');
            }
          }
          return migration.down(context, sequelize.constructor);
        },
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMigrations' }),
  logger: console,
});

module.exports = umzug;
