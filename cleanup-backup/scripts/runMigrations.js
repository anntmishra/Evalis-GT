const { sequelize } = require('../config/db');
const addBatchIdToSubjects = require('../migrations/add-batchId-to-subjects');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');

    const queryInterface = sequelize.getQueryInterface();
    
    // Run the migration to add batchId to subjects
    console.log('Applying migration: add-batchId-to-subjects');
    await addBatchIdToSubjects.up(queryInterface, sequelize.Sequelize);
    
    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Connect to the database and run migrations
console.log('Connecting to database...');
sequelize.authenticate()
  .then(() => {
    console.log('Database connected');
    runMigrations();
  })
  .catch(error => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }); 