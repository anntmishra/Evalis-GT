const { sequelize } = require('../config/db');
const { Student, Batch } = require('../models');
const colors = require('colors');

// Connect to database and clean up duplicate batches
const cleanupDuplicateBatches = async () => {
  try {
    console.log('Connecting to database...'.yellow);
    await sequelize.authenticate();
    console.log(`Database connected`.cyan.underline);

    // Get all batches
    const allBatches = await Batch.findAll();
    console.log(`Total batches in database: ${allBatches.length}`.cyan);

    // Find duplicate batches (those with BTech prefix)
    const batchesToRemove = allBatches.filter(batch => batch.id.startsWith('BTech'));
    console.log(`Found ${batchesToRemove.length} batches with 'BTech' prefix to remove`.yellow);

    if (batchesToRemove.length > 0) {
      // Map each 'BTech' batch to its clean version
      const batchMapping = {};
      
      for (const batch of batchesToRemove) {
        // Extract the year part (e.g., from BTech2023 to 2023)
        const yearPart = batch.id.replace('BTech', '');
        // The corresponding batch would have ID like 2023-2027
        const cleanBatchId = allBatches.find(b => b.id.startsWith(yearPart))?.id;
        
        if (cleanBatchId) {
          batchMapping[batch.id] = cleanBatchId;
          console.log(`  - ${batch.id} will be mapped to ${cleanBatchId}`.grey);
        } else {
          console.log(`  - Could not find a corresponding batch for ${batch.id}`.red);
        }
      }

      // Update students to use the clean batch IDs
      console.log('Updating student records to use clean batch IDs...'.yellow);
      
      for (const [oldBatchId, newBatchId] of Object.entries(batchMapping)) {
        // Find students using the old batch ID
        const studentsToUpdate = await Student.findAll({
          where: { batch: oldBatchId }
        });
        
        console.log(`Found ${studentsToUpdate.length} students using batch ${oldBatchId}`.cyan);
        
        // Update each student to use the new batch ID
        for (const student of studentsToUpdate) {
          await student.update({ batch: newBatchId });
          console.log(`  - Updated student ${student.id} from batch ${oldBatchId} to ${newBatchId}`.grey);
        }
      }

      // Now delete the duplicate batches
      console.log('Deleting duplicate batches...'.yellow);
      const batchIdsToRemove = batchesToRemove.map(b => b.id);
      
      const deletedBatches = await Batch.destroy({
        where: {
          id: batchIdsToRemove
        }
      });
      
      console.log(`Deleted ${deletedBatches} duplicate batches`.green);
    }

    console.log('Batch cleanup completed successfully'.green.bold);
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

// Run the function
cleanupDuplicateBatches(); 