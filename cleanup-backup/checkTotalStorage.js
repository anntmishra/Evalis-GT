const dotenv = require('dotenv');
const path = require('path');

// Load production environment variables
dotenv.config({ path: path.join(__dirname, '../.env.production') });

const { connectDB, sequelize } = require('./config/db');

const checkTotalStorage = async () => {
  try {
    console.log('🔍 COMPREHENSIVE STORAGE ANALYSIS');
    console.log('='*60);
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');
    
    // Check ALL databases in this Postgres instance
    console.log('\n📊 All Databases:');
    const allDbsQuery = `
      SELECT 
        datname as database_name,
        pg_size_pretty(pg_database_size(datname)) as size,
        pg_database_size(datname) as bytes
      FROM pg_database 
      WHERE datistemplate = false
      ORDER BY pg_database_size(datname) DESC;
    `;
    
    const allDbs = await sequelize.query(allDbsQuery, { type: sequelize.QueryTypes.SELECT });
    let totalBytes = 0;
    
    allDbs.forEach(db => {
      console.log(`   ${db.database_name}: ${db.size}`);
      totalBytes += parseInt(db.bytes);
    });
    
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(3);
    console.log(`\n📊 Total Database Storage: ${totalGB} GB`);
    
    // Check WAL files and other storage
    console.log('\n🔍 Storage Breakdown:');
    
    try {
      // Check WAL files
      const walQuery = `
        SELECT 
          slot_name,
          active,
          pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as wal_retained
        FROM pg_replication_slots;
      `;
      
      const walInfo = await sequelize.query(walQuery, { type: sequelize.QueryTypes.SELECT });
      if (walInfo.length > 0) {
        console.log('WAL Files:');
        walInfo.forEach(wal => {
          console.log(`   Slot: ${wal.slot_name}, Active: ${wal.active}, Retained: ${wal.wal_retained}`);
        });
      } else {
        console.log('WAL Files: No replication slots found');
      }
    } catch (e) {
      console.log('WAL Files: Unable to check (may require superuser)');
    }
    
    // Check shared buffers and other settings
    try {
      const settingsQuery = `
        SELECT name, setting, unit 
        FROM pg_settings 
        WHERE name IN ('shared_buffers', 'effective_cache_size', 'work_mem', 'maintenance_work_mem')
        ORDER BY name;
      `;
      
      const settings = await sequelize.query(settingsQuery, { type: sequelize.QueryTypes.SELECT });
      console.log('\nDatabase Configuration:');
      settings.forEach(setting => {
        console.log(`   ${setting.name}: ${setting.setting} ${setting.unit || ''}`);
      });
    } catch (e) {
      console.log('Configuration: Unable to check');
    }
    
    // Check for any large objects (blobs)
    try {
      const largeObjectsQuery = `
        SELECT 
          COUNT(*) as count,
          pg_size_pretty(SUM(pg_lo_size(oid))) as total_size
        FROM pg_largeobject_metadata;
      `;
      
      const loInfo = await sequelize.query(largeObjectsQuery, { type: sequelize.QueryTypes.SELECT });
      if (loInfo[0].count > 0) {
        console.log(`\nLarge Objects: ${loInfo[0].count} objects, ${loInfo[0].total_size}`);
      } else {
        console.log('\nLarge Objects: None found');
      }
    } catch (e) {
      console.log('\nLarge Objects: Unable to check');
    }
    
    // Current database detailed analysis
    console.log('\n🔍 Current Database (neondb) Analysis:');
    
    const currentDbQuery = `
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as db_size,
        pg_size_pretty(pg_total_relation_size('information_schema.tables')) as schema_size
    `;
    
    const currentDb = await sequelize.query(currentDbQuery, { type: sequelize.QueryTypes.SELECT });
    console.log(`Database Size: ${currentDb[0].db_size}`);
    
    // Check tablespace usage
    try {
      const tablespaceQuery = `
        SELECT 
          spcname as tablespace_name,
          pg_size_pretty(pg_tablespace_size(spcname)) as size
        FROM pg_tablespace;
      `;
      
      const tablespaces = await sequelize.query(tablespaceQuery, { type: sequelize.QueryTypes.SELECT });
      console.log('\nTablespaces:');
      tablespaces.forEach(ts => {
        console.log(`   ${ts.tablespace_name}: ${ts.size}`);
      });
    } catch (e) {
      console.log('\nTablespaces: Unable to check');
    }
    
    // Summary and recommendations
    console.log('\n💡 ANALYSIS SUMMARY:');
    console.log(`Total Databases Storage: ${totalGB} GB`);
    console.log(`Neon Limit: 0.5 GB`);
    console.log(`Current Usage: ${(totalGB/0.5*100).toFixed(1)}% of limit`);
    
    if (totalGB > 0.5) {
      console.log('\n🚨 RECOMMENDATIONS:');
      console.log('1. The storage usage exceeds Neon free tier limit');
      console.log('2. Consider upgrading to Neon Pro plan');
      console.log('3. Or migrate to a different database solution');
      console.log('4. There may be multiple databases or WAL files consuming space');
    }
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

checkTotalStorage();
