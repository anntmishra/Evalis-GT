require('dotenv').config();
const { sequelize, TeachingAssignment, Subject, TeachingAssignment } = require('../models');

async function migrate() {
  console.log('Starting migration from TeachingAssignment to TeachingAssignments...');
  
  try {
    // 1. Authenticate and sync models just in case
    await sequelize.authenticate();
    
    // 2. Fetch all legacy TeachingAssignment records with their associated Subject
    const legacyRecords = await TeachingAssignment.findAll({
      include: [{
        model: Subject,
        attributes: ['id', 'batchId', 'semesterId', 'tenantId']
      }]
    });

    console.log(`Found ${legacyRecords.length} legacy TeachingAssignment records.`);

    if (legacyRecords.length === 0) {
      console.log('Nothing to migrate. Exiting.');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;

    // 3. Migrate each record
    for (const record of legacyRecords) {
      try {
        const subject = record.Subject;
        
        if (!subject) {
          console.warn(`Skipping record ID ${record.id}: Associated Subject not found.`);
          errorCount++;
          continue;
        }
        
        if (!subject.batchId) {
          console.warn(`Skipping record ID ${record.id}: Subject ${subject.id} has no batchId.`);
          errorCount++;
          continue;
        }

        // Check if an assignment already exists to prevent duplicates
        const existingAssignment = await TeachingAssignment.findOne({
          where: {
            teacherId: record.teacherId,
            subjectId: record.subjectId,
            batchId: subject.batchId,
            sessionType: 'lecture'
          }
        });

        if (existingAssignment) {
          console.log(`Assignment already exists for Teacher ${record.teacherId} and Subject ${record.subjectId}. Skipping.`);
          continue;
        }

        // Create the new TeachingAssignment
        await TeachingAssignment.create({
          tenantId: subject.tenantId || null,
          teacherId: record.teacherId,
          subjectId: record.subjectId,
          batchId: subject.batchId,
          semesterId: subject.semesterId || null,
          sessionType: 'lecture',
          isActive: true,
          sectionId: null, // Default to null since legacy didn't use sections
          assignedBy: 'system_migration'
        });

        successCount++;
      } catch (err) {
        console.error(`Error migrating record ID ${record.id}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n--- Migration Complete ---');
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed/Skipped: ${errorCount}`);

  } catch (error) {
    console.error('Fatal Migration Error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

migrate();
