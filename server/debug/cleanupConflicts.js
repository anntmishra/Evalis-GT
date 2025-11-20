const { sequelize } = require('../config/db');

async function dropConflictingObjects() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Checking for conflicting indexes and constraints...');
    
    // Check for indexes with teacher_id pattern
    const [indexes] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname LIKE '%teacher_id%' OR indexname LIKE '%subject_id%' OR indexname LIKE '%batch_id%'
      AND schemaname = 'public';
    `);
    
    console.log('Found indexes:', indexes);
    
    // Drop any conflicting indexes
    for (const index of indexes) {
      try {
        await sequelize.query(`DROP INDEX IF EXISTS "${index.indexname}";`, { transaction });
        console.log(`Dropped index: ${index.indexname}`);
      } catch (error) {
        console.log(`Could not drop index ${index.indexname}:`, error.message);
      }
    }
    
    // Check for sequences or other objects with conflicting names
    const [sequences] = await sequelize.query(`
      SELECT sequencename 
      FROM pg_sequences 
      WHERE sequencename LIKE '%teacher_id%' OR sequencename LIKE '%subject_id%' OR sequencename LIKE '%batch_id%';
    `);
    
    console.log('Found sequences:', sequences);
    
    // Check for any tables with conflicting names
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%teacher_id%' OR table_name LIKE '%subject_id%' OR table_name LIKE '%batch_id%'
      AND table_schema = 'public';
    `);
    
    console.log('Found tables:', tables);
    
    // Drop any conflicting tables
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE;`, { transaction });
        console.log(`Dropped table: ${table.table_name}`);
      } catch (error) {
        console.log(`Could not drop table ${table.table_name}:`, error.message);
      }
    }
    
    await transaction.commit();
    console.log('Cleanup completed successfully!');
    
  } catch (error) {
    await transaction.rollback();
    console.error('Cleanup failed:', error);
    throw error;
  }
}

// Run cleanup if called directly
if (require.main === module) {
  dropConflictingObjects()
    .then(() => {
      console.log('Cleanup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { dropConflictingObjects };