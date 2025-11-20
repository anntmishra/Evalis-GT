const { sequelize } = require('../config/db');

async function checkTableStructure() {
  try {
    console.log('Checking quizzes table structure...');
    
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'quizzes'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns in quizzes table:');
    console.table(columns);
    
    // Now let's check if there are indexes that might conflict
    const [indexes] = await sequelize.query(`
      SELECT 
        i.indexname,
        i.indexdef,
        string_agg(a.attname, ', ' ORDER BY a.attnum) as columns
      FROM pg_indexes i
      JOIN pg_class t ON t.relname = i.tablename
      JOIN pg_index idx ON idx.indexrelid = (i.schemaname||'.'||i.indexname)::regclass
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
      WHERE i.tablename = 'quizzes'
      GROUP BY i.indexname, i.indexdef
      ORDER BY i.indexname;
    `);
    
    console.log('\nIndexes:');
    console.table(indexes);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTableStructure();