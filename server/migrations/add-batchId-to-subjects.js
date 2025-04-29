'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add batchId column to Subjects table
    await queryInterface.addColumn('Subjects', 'batchId', {
      type: Sequelize.STRING,
      allowNull: true, // Initially allow null for existing records
      references: {
        model: 'Batches',
        key: 'id'
      }
    });

    // Create a SubjectBatch join table if it doesn't exist
    const tables = await queryInterface.showAllTables();
    if (tables.includes('SubjectBatch')) {
      // Get existing subject-batch mappings
      const [subjectBatches] = await queryInterface.sequelize.query(
        'SELECT "subjectId", "batchId" FROM "SubjectBatch";'
      );

      // Update subjects with batchId from the join table
      for (const record of subjectBatches) {
        await queryInterface.sequelize.query(
          `UPDATE "Subjects" SET "batchId" = '${record.batchId}' WHERE "id" = '${record.subjectId}';`
        );
      }

      // After migration, drop the join table as it's no longer needed
      await queryInterface.dropTable('SubjectBatch');
    }

    // After migration completes, make batchId required for future records
    // This will be a separate migration run later to avoid breaking existing data
  },

  down: async (queryInterface, Sequelize) => {
    // Create the join table again
    await queryInterface.createTable('SubjectBatch', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      subjectId: {
        type: Sequelize.STRING,
        references: {
          model: 'Subjects',
          key: 'id'
        }
      },
      batchId: {
        type: Sequelize.STRING,
        references: {
          model: 'Batches',
          key: 'id'
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Copy data from Subjects.batchId to the join table
    await queryInterface.sequelize.query(`
      INSERT INTO "SubjectBatch" ("subjectId", "batchId", "createdAt", "updatedAt")
      SELECT "id", "batchId", "createdAt", "updatedAt"
      FROM "Subjects"
      WHERE "batchId" IS NOT NULL;
    `);

    // Remove the batchId column from Subjects
    await queryInterface.removeColumn('Subjects', 'batchId');
  }
}; 