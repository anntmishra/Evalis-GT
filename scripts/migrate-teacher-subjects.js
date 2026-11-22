const { sequelize } = require('../server/config/db');
const { TeachingAssignment, Subject } = require('../server/models');
const crypto = require('crypto');

async function runMigration() {
  console.log('Starting legacy TeacherSubjects to TeachingAssignments migration...');
  
  try {
    // 1. Fetch all rows from TeacherSubjects table
    const [legacyRows] = await sequelize.query('SELECT * FROM "TeacherSubjects"');
    console.log(`Found ${legacyRows.length} legacy TeacherSubject rows.`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. Iterate and migrate
    for (const row of legacyRows) {
      try {
        const { teacherId, subjectId } = row;
        
        if (!teacherId || !subjectId) {
          console.warn(`Skipping invalid row: teacherId=${teacherId}, subjectId=${subjectId}`);
          skippedCount++;
          continue;
        }

        // Fetch subject details to resolve extra fields
        const subject = await Subject.findOne({ where: { id: subjectId } });
        
        let batchId = null;
        let semesterId = null;
        let tenantId = null;
        
        if (subject) {
          batchId = subject.batchId || null;
          semesterId = subject.semesterId || null;
          tenantId = subject.tenantId || null;
        }

        // 3. Upsert into TeachingAssignments
        const [assignment, created] = await TeachingAssignment.findOrCreate({
          where: {
            teacherId,
            subjectId,
            sessionType: 'lecture'
          },
          defaults: {
            id: crypto.randomUUID(),
            teacherId,
            subjectId,
            sessionType: 'lecture',
            isActive: true,
            assignedBy: 'system-migration',
            batchId,
            semesterId,
            tenantId
          }
        });

        if (created) {
          successCount++;
        } else {
          skippedCount++;
        }
      } catch (err) {
        console.error(`Error migrating row (teacherId: ${row.teacherId}, subjectId: ${row.subjectId}):`, err.message);
        errorCount++;
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Total Rows Processed: ${legacyRows.length}`);
    console.log(`Successfully Migrated: ${successCount}`);
    console.log(`Skipped (Duplicates/Invalid): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('-------------------------\n');

  } catch (err) {
    console.error('Migration failed at root level:', err);
  } finally {
    process.exit(0);
  }
}

runMigration();
