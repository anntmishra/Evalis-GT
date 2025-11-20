const { sequelize } = require('../config/db');

async function checkQuizTables() {
  try {
    console.log('Checking existing quiz tables...');
    
    // Check what quiz-related tables exist
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%quiz%'
      ORDER BY table_name;
    `);
    
    console.log('Existing quiz tables:', results.map(r => r.table_name));
    
    // Check constraints on quiz tables
    for (const table of results) {
      console.log(`\nConstraints for ${table.table_name}:`);
      const [constraints] = await sequelize.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints 
        WHERE table_name = '${table.table_name}'
        AND table_schema = 'public';
      `);
      console.log(constraints);
    }
    
    // Check indexes
    for (const table of results) {
      console.log(`\nIndexes for ${table.table_name}:`);
      const [indexes] = await sequelize.query(`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = '${table.table_name}';
      `);
      console.log(indexes);
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    process.exit(0);
  }
}

checkQuizTables();