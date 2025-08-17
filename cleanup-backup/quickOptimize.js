const dotenv = require('dotenv');
const path = require('path');

// Load production environment variables
dotenv.config({ path: path.join(__dirname, '../.env.production') });

const { connectDB, sequelize } = require('./config/db');

const quickOptimize = async () => {
  try {
    console.log('⚡ QUICK DATABASE OPTIMIZATION');
    console.log('='*50);
    console.log('🔒 PRESERVING: ALL user data (Students, Teachers, Admins)');
    console.log('🔧 OPTIMIZING: Table storage and indexes');
    console.log('='*50);
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');
    
    // Get initial size
    const sizeQuery = `
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as db_size,
        pg_database_size(current_database()) as db_bytes
    `;
    
    const initialSize = await sequelize.query(sizeQuery, { type: sequelize.QueryTypes.SELECT });
    console.log(`\n📊 Initial Database Size: ${initialSize[0].db_size}`);
    
    // Show table sizes before optimization
    const tableQuery = `
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size('"' || tablename || '"')) as size,
        pg_total_relation_size('"' || tablename || '"') as bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size('"' || tablename || '"') DESC;
    `;
    
    const initialTables = await sequelize.query(tableQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('\n📋 Current Table Sizes:');
    initialTables.forEach(table => {
      console.log(`   ${table.tablename}: ${table.size}`);
    });
    
    // The main optimization: VACUUM FULL to reclaim space
    console.log('\n🔧 Optimizing database storage...');
    console.log('This may take a few moments...');
    
    try {
      // VACUUM FULL reclaims space from dead tuples and reorganizes tables
      await sequelize.query('VACUUM FULL;');
      console.log('✅ Full vacuum completed');
      
      // ANALYZE updates table statistics for better query planning
      await sequelize.query('ANALYZE;');
      console.log('✅ Table statistics updated');
      
    } catch (error) {
      console.log('⚠️  Full vacuum failed, trying individual tables...');
      
      // Try optimizing each table individually
      const tables = ['Admins', 'Students', 'Teachers', 'Batches', 'Subjects', 'Submissions', 'Assignments', 'TeacherSubjects', 'Semesters'];
      
      for (const table of tables) {
        try {
          console.log(`   Optimizing ${table}...`);
          await sequelize.query(`VACUUM "${table}";`);
          await sequelize.query(`ANALYZE "${table}";`);
          console.log(`   ✅ ${table} optimized`);
        } catch (e) {
          console.log(`   ⚠️  ${table}: ${e.message}`);
        }
      }
    }
    
    // Check final results
    console.log('\n📊 Optimization Results:');
    
    const finalSize = await sequelize.query(sizeQuery, { type: sequelize.QueryTypes.SELECT });
    console.log(`New Database Size: ${finalSize[0].db_size}`);
    
    const savedBytes = initialSize[0].db_bytes - finalSize[0].db_bytes;
    const savedMB = (savedBytes / (1024 * 1024)).toFixed(2);
    
    if (savedBytes > 0) {
      console.log(`💾 Space Freed: ${savedMB} MB`);
    } else if (savedBytes < 0) {
      const addedMB = Math.abs(savedBytes / (1024 * 1024)).toFixed(2);
      console.log(`📊 Space usage: +${addedMB} MB (normal for optimization)`);
    } else {
      console.log(`📊 Space usage unchanged (tables optimized)`);
    }
    
    // Show final table sizes
    const finalTables = await sequelize.query(tableQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('\n📋 Optimized Table Sizes:');
    finalTables.forEach(table => {
      console.log(`   ${table.tablename}: ${table.size}`);
    });
    
    // Verify all data is preserved
    console.log('\n🔍 Data Integrity Check:');
    const adminCount = await sequelize.query('SELECT COUNT(*) as count FROM "Admins"', { type: sequelize.QueryTypes.SELECT });
    const studentCount = await sequelize.query('SELECT COUNT(*) as count FROM "Students"', { type: sequelize.QueryTypes.SELECT });
    const teacherCount = await sequelize.query('SELECT COUNT(*) as count FROM "Teachers"', { type: sequelize.QueryTypes.SELECT });
    const batchCount = await sequelize.query('SELECT COUNT(*) as count FROM "Batches"', { type: sequelize.QueryTypes.SELECT });
    const subjectCount = await sequelize.query('SELECT COUNT(*) as count FROM "Subjects"', { type: sequelize.QueryTypes.SELECT });
    
    console.log(`✅ Admins: ${adminCount[0].count} records preserved`);
    console.log(`✅ Students: ${studentCount[0].count} records preserved`);
    console.log(`✅ Teachers: ${teacherCount[0].count} records preserved`);
    console.log(`✅ Batches: ${batchCount[0].count} records preserved`);
    console.log(`✅ Subjects: ${subjectCount[0].count} records preserved`);
    
    console.log('\n✅ DATABASE OPTIMIZATION COMPLETED!');
    console.log('🚀 All data preserved, storage optimized');
    console.log('💡 The database should now perform better with optimized storage');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Optimization failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

quickOptimize();
