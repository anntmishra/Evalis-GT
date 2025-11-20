const { sequelize } = require('../config/db');

async function findAllConflictingObjects() {
  try {
    console.log('Searching for ALL objects with "quizzes_teacher_id" name...');
    
    // Check for any relation (table, view, sequence, etc.) with this name
    const [relations] = await sequelize.query(`
      SELECT 
        schemaname,
        tablename as name,
        'table' as type
      FROM pg_tables 
      WHERE tablename = 'quizzes_teacher_id'
      
      UNION ALL
      
      SELECT 
        schemaname,
        viewname as name,
        'view' as type
      FROM pg_views 
      WHERE viewname = 'quizzes_teacher_id'
      
      UNION ALL
      
      SELECT 
        schemaname,
        sequencename as name,
        'sequence' as type
      FROM pg_sequences 
      WHERE sequencename = 'quizzes_teacher_id'
      
      UNION ALL
      
      SELECT 
        schemaname,
        indexname as name,
        'index' as type
      FROM pg_indexes 
      WHERE indexname = 'quizzes_teacher_id'
      
      UNION ALL
      
      SELECT 
        n.nspname as schemaname,
        c.relname as name,
        CASE c.relkind 
          WHEN 'r' THEN 'table'
          WHEN 'v' THEN 'view'
          WHEN 'i' THEN 'index'
          WHEN 'S' THEN 'sequence'
          WHEN 'c' THEN 'composite_type'
          WHEN 't' THEN 'toast_table'
          ELSE c.relkind::text
        END as type
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'quizzes_teacher_id'
      AND n.nspname = 'public';
    `);
    
    console.log('Found relations with name "quizzes_teacher_id":', relations);
    
    // Also check for constraints with this name
    const [constraints] = await sequelize.query(`
      SELECT 
        constraint_schema,
        constraint_name,
        table_name,
        constraint_type
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'quizzes_teacher_id';
    `);
    
    console.log('Found constraints with name "quizzes_teacher_id":', constraints);
    
    // Check for triggers
    const [triggers] = await sequelize.query(`
      SELECT 
        trigger_schema,
        trigger_name,
        event_object_table
      FROM information_schema.triggers 
      WHERE trigger_name = 'quizzes_teacher_id';
    `);
    
    console.log('Found triggers with name "quizzes_teacher_id":', triggers);
    
    // Now let's drop whatever we find
    for (const rel of relations) {
      try {
        let dropCommand;
        switch (rel.type) {
          case 'table':
            dropCommand = `DROP TABLE IF EXISTS "${rel.name}" CASCADE;`;
            break;
          case 'view':
            dropCommand = `DROP VIEW IF EXISTS "${rel.name}" CASCADE;`;
            break;
          case 'sequence':
            dropCommand = `DROP SEQUENCE IF EXISTS "${rel.name}" CASCADE;`;
            break;
          case 'index':
            dropCommand = `DROP INDEX IF EXISTS "${rel.name}";`;
            break;
          default:
            dropCommand = `DROP ${rel.type.toUpperCase()} IF EXISTS "${rel.name}" CASCADE;`;
        }
        
        await sequelize.query(dropCommand);
        console.log(`Dropped ${rel.type}: ${rel.name}`);
      } catch (error) {
        console.log(`Could not drop ${rel.type} ${rel.name}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error during search:', error);
  } finally {
    process.exit(0);
  }
}

findAllConflictingObjects();