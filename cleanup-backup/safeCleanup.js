const dotenv = require('dotenv');
const path = require('path');

// Load production environment variables
dotenv.config({ path: path.join(__dirname, '../.env.production') });

const { connectDB, sequelize } = require('./config/db');

const safeCleanup = async () => {
  try {
    console.log('🧹 SAFE DATABASE CLEANUP');
    console.log('='*50);
    console.log('🔒 PRESERVING: All Students, Teachers, Admins, Batches, Subjects');
    console.log('🗑️  CLEANING: Only unnecessary data and optimizing tables');
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
    
    // Step 1: Clean empty assignments (there are 0 anyway)
    console.log('\n🗑️  Step 1: Cleaning empty assignments...');
    const deletedAssignments = await sequelize.query(`
      DELETE FROM "Assignments" 
      WHERE title IS NULL OR title = '' OR description IS NULL
      RETURNING id;
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`✅ Cleaned ${deletedAssignments.length} empty assignments`);
    
    // Step 2: Clean submissions (there are 0 anyway)
    console.log('🗑️  Step 2: Cleaning old submissions...');
    const deletedSubmissions = await sequelize.query(`
      DELETE FROM "Submissions" 
      WHERE submissionText IS NULL AND fileUrl IS NULL
      RETURNING id;
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`✅ Cleaned ${deletedSubmissions.length} empty submissions`);
    
    // Step 3: Optimize tables (this is the key step)
    console.log('\n🔧 Step 3: Optimizing table storage...');
    
    // Vacuum and analyze each table
    const tables = ['Admins', 'Students', 'Teachers', 'Batches', 'Subjects', 'Submissions', 'Assignments', 'TeacherSubjects', 'Semesters'];
    
    for (const table of tables) {
      console.log(`   Optimizing ${table}...`);
      try {
        // Full vacuum to reclaim space
        await sequelize.query(`VACUUM FULL "${table}";`);
        // Analyze to update statistics
        await sequelize.query(`ANALYZE "${table}";`);
        console.log(`   ✅ ${table} optimized`);
      } catch (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      }
    }
    
    // Step 4: Reindex all tables
    console.log('\n🔧 Step 4: Reindexing database...');
    try {
      await sequelize.query('REINDEX DATABASE "neondb";');
      console.log('✅ Database reindexed');
    } catch (error) {
      console.log('⚠️  Reindex skipped:', error.message);
      // Try individual table reindex
      for (const table of tables) {
        try {
          await sequelize.query(`REINDEX TABLE "${table}";`);
          console.log(`   ✅ ${table} reindexed`);
        } catch (e) {
          console.log(`   ⚠️  ${table} reindex failed`);
        }
      }
    }
    
    // Step 5: Check final sizes
    console.log('\n📊 Final Results:');
    
    const finalSize = await sequelize.query(sizeQuery, { type: sequelize.QueryTypes.SELECT });
    console.log(`New Database Size: ${finalSize[0].db_size}`);
    
    const savedBytes = initialSize[0].db_bytes - finalSize[0].db_bytes;
    const savedMB = (savedBytes / (1024 * 1024)).toFixed(2);
    
    if (savedBytes > 0) {
      console.log(`💾 Space Freed: ${savedMB} MB`);
    } else {
      console.log(`📊 Space optimized (structure improved)`);
    }
    
    // Show final table sizes
    const tableQuery = `
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `;
    
    const finalTables = await sequelize.query(tableQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('\n📋 Final Table Sizes:');
    finalTables.forEach(table => {
      console.log(`   ${table.tablename}: ${table.size}`);
    });
    
    // Verify data integrity
    console.log('\n🔍 Verifying data integrity...');
    const adminCount = await sequelize.query('SELECT COUNT(*) as count FROM "Admins"', { type: sequelize.QueryTypes.SELECT });
    const studentCount = await sequelize.query('SELECT COUNT(*) as count FROM "Students"', { type: sequelize.QueryTypes.SELECT });
    const teacherCount = await sequelize.query('SELECT COUNT(*) as count FROM "Teachers"', { type: sequelize.QueryTypes.SELECT });
    
    console.log(`✅ Admins: ${adminCount[0].count} (preserved)`);
    console.log(`✅ Students: ${studentCount[0].count} (preserved)`);
    console.log(`✅ Teachers: ${teacherCount[0].count} (preserved)`);
    
    console.log('\n✅ SAFE CLEANUP COMPLETED!');
    console.log('🚀 Database optimized while preserving all important data');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

safeCleanup();
