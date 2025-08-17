const dotenv = require('dotenv');
const path = require('path');

// Load production environment variables
dotenv.config({ path: path.join(__dirname, '../.env.production') });

const { connectDB, sequelize } = require('./config/db');

const emergencyCleanup = async () => {
  try {
    console.log('🚨 EMERGENCY DATABASE CLEANUP - Storage Full'.red.bold);
    console.log('='*60);
    console.log('🔒 PRESERVING: All Students, Teachers, and Admin accounts'.cyan);
    console.log('🗑️  CLEANING: Only submissions, assignments, and temporary data'.yellow);
    console.log('='*60);
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');
    
    // Get current database size
    console.log('\n📊 Current Database Status:'.yellow);
    
    const sizeQuery = `
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as db_size,
        pg_database_size(current_database()) as db_bytes
    `;
    
    const dbSize = await sequelize.query(sizeQuery, { type: sequelize.QueryTypes.SELECT });
    console.log(`Database Size: ${dbSize[0].db_size}`);
    
    // Find the largest tables
    const tableQuery = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10;
    `;
    
    const tables = await sequelize.query(tableQuery, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n📋 Largest Tables:'.cyan);
    tables.forEach(table => {
      console.log(`   ${table.tablename}: ${table.size}`.gray);
    });
    
    // EMERGENCY CLEANUP ACTIONS
    console.log('\n🚨 Starting Emergency Cleanup...'.red.bold);
    
    // 1. Remove all file content from submissions (keep metadata)
    console.log('🗑️  Step 1: Removing submission file content...');
    const fileCleanup = await sequelize.query(`
      UPDATE "Submissions" 
      SET "fileContent" = NULL, "fileSize" = 0
      WHERE "fileContent" IS NOT NULL;
    `);
    console.log('✅ All submission file content removed');
    
    // 2. Delete ALL submissions older than 7 days (keep only recent ones)
    console.log('🗑️  Step 2: Deleting old submissions (keeping last 7 days)...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const oldSubmissions = await sequelize.query(`
      DELETE FROM "Submissions" 
      WHERE "createdAt" < :sevenDaysAgo
      RETURNING id;
    `, {
      replacements: { sevenDaysAgo },
      type: sequelize.QueryTypes.SELECT
    });
    console.log(`✅ Deleted ${oldSubmissions.length} old submissions`);
    
    // 3. Clean up duplicate submissions (keep only latest per student per assignment)
    console.log('🗑️  Step 3: Removing duplicate submissions...');
    const duplicateSubmissions = await sequelize.query(`
      DELETE FROM "Submissions" 
      WHERE id NOT IN (
        SELECT DISTINCT ON ("studentId", "assignmentId") id
        FROM "Submissions"
        ORDER BY "studentId", "assignmentId", "createdAt" DESC
      )
      RETURNING id;
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`✅ Removed ${duplicateSubmissions.length} duplicate submissions`);
    
    // 4. Clean up any empty or null assignments and their submissions
    console.log('🗑️  Step 4: Cleaning empty assignments...');
    
    // First remove submissions for empty assignments
    const emptyAssignmentSubmissions = await sequelize.query(`
      DELETE FROM "Submissions" 
      WHERE "assignmentId" IN (
        SELECT id FROM "Assignments" 
        WHERE title IS NULL OR title = '' OR description IS NULL OR description = ''
      )
      RETURNING id;
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`✅ Removed ${emptyAssignmentSubmissions.length} submissions for empty assignments`);
    
    // Then remove the empty assignments themselves
    const emptyAssignments = await sequelize.query(`
      DELETE FROM "Assignments" 
      WHERE title IS NULL OR title = '' OR description IS NULL OR description = ''
      RETURNING id;
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`✅ Removed ${emptyAssignments.length} empty assignments`);
    
    // 5. Vacuum and analyze
    console.log('🧹 Step 5: Vacuuming database...');
    await sequelize.query('VACUUM FULL;');
    await sequelize.query('ANALYZE;');
    console.log('✅ Database vacuumed and analyzed');
    
    // Check final size
    console.log('\n📊 Final Database Status:'.green);
    const finalSize = await sequelize.query(sizeQuery, { type: sequelize.QueryTypes.SELECT });
    console.log(`New Database Size: ${finalSize[0].db_size}`);
    
    const savedBytes = dbSize[0].db_bytes - finalSize[0].db_bytes;
    const savedMB = (savedBytes / (1024 * 1024)).toFixed(2);
    console.log(`💾 Space Freed: ${savedMB} MB`);
    
    // Final table sizes
    const finalTables = await sequelize.query(tableQuery, { type: sequelize.QueryTypes.SELECT });
    console.log('\n📋 Final Table Sizes:'.green);
    finalTables.forEach(table => {
      console.log(`   ${table.tablename}: ${table.size}`.gray);
    });
    
    console.log('\n✅ EMERGENCY CLEANUP COMPLETED!'.green.bold);
    console.log('🚀 Database should now have sufficient space for normal operations.'.cyan);
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Emergency cleanup failed:'.red.bold);
    console.error(error.message);
    console.error(error.stack);
    
    // Try basic cleanup as fallback
    try {
      console.log('\n🔄 Attempting basic cleanup (submissions only)...'.yellow);
      await sequelize.query('DELETE FROM "Submissions" WHERE "createdAt" < NOW() - INTERVAL \'3 days\';');
      await sequelize.query('UPDATE "Submissions" SET "fileContent" = NULL WHERE "fileContent" IS NOT NULL;');
      await sequelize.query('VACUUM;');
      console.log('✅ Basic cleanup completed - removed old submissions and file content');
    } catch (fallbackError) {
      console.error('❌ Even basic cleanup failed:', fallbackError.message);
    }
    
    process.exit(1);
  }
};

// Add colors for console output
const colors = {
  red: { bold: '\x1b[1m\x1b[31m' },
  green: { bold: '\x1b[1m\x1b[32m' },
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m'
};

// Extend String prototype for colors
String.prototype.red = { bold: function() { return colors.red.bold + this + colors.reset; } };
String.prototype.green = { bold: function() { return colors.green.bold + this + colors.reset; } };
String.prototype.yellow = function() { return colors.yellow + this + colors.reset; };
String.prototype.cyan = function() { return colors.cyan + this + colors.reset; };
String.prototype.gray = function() { return colors.gray + this + colors.reset; };

emergencyCleanup();
