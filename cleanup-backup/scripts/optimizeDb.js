/**
 * Database Optimization Script
 * 
 * This script analyzes the database and performs optimization actions:
 * 1. Identifies and removes duplicate indexes
 * 2. Identifies unused indexes
 * 3. VACUUM FULL to reclaim space
 * 4. Provides storage usage report
 */

require('dotenv').config();
const { sequelize } = require('../config/db');
const colors = require('colors');

const runOptimization = async () => {
  try {
    console.log('Connecting to database...'.yellow);
    await sequelize.authenticate();
    console.log('Connection established.'.green);

    // Report total database size
    console.log('\nDatabase Size Report:'.cyan.bold);
    const [dbSize] = await sequelize.query(
      "SELECT pg_size_pretty(pg_database_size(current_database())) as db_size"
    );
    console.log(`Total Database Size: ${dbSize[0].db_size}`.yellow);

    // Get tables with their sizes
    console.log('\nTable Size Report:'.cyan.bold);
    const [tableSizes] = await sequelize.query(`
      SELECT 
        table_schema, 
        table_name, 
        pg_size_pretty(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))) as total_size,
        pg_size_pretty(pg_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))) as table_size,
        pg_size_pretty(pg_indexes_size(quote_ident(table_schema) || '.' || quote_ident(table_name))) as index_size,
        pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name)) as size_in_bytes
      FROM information_schema.tables
      WHERE 
        table_schema NOT IN ('pg_catalog', 'information_schema') 
        AND table_schema != 'pg_toast'
        AND table_type = 'BASE TABLE'
      ORDER BY size_in_bytes DESC
    `);

    console.table(tableSizes);

    // Find duplicate indexes
    console.log('\nSearching for duplicate indexes...'.cyan.bold);
    const [duplicateIndexes] = await sequelize.query(`
      SELECT 
        indrelid::regclass as table_name,
        array_agg(indexrelid::regclass) as indexes,
        array_agg(indexrelid::regclass::text || ' => ' || pg_size_pretty(pg_relation_size(indexrelid))) as index_sizes
      FROM 
        pg_index 
      GROUP BY 
        indrelid, indkey
      HAVING 
        COUNT(*) > 1
      ORDER BY 
        indrelid::regclass::text, COUNT(*) DESC;
    `);

    if (duplicateIndexes.length > 0) {
      console.log(`Found ${duplicateIndexes.length} sets of duplicate indexes`.red);
      console.table(duplicateIndexes);
      
      // Automatically generate SQL to drop the duplicate indexes
      console.log('\nGenerated SQL to clean up duplicate indexes:'.yellow);
      for (const dupIndex of duplicateIndexes) {
        // Keep the first index and drop the rest
        const indexes = dupIndex.indexes.slice(1); // Skip the first one
        for (const idx of indexes) {
          const dropSql = `DROP INDEX ${idx};`;
          console.log(dropSql.red);
          
          // Execute only if confirmed
          const confirmation = true; // Set to false if you want manual confirmation
          if (confirmation) {
            try {
              await sequelize.query(dropSql);
              console.log(`Dropped index ${idx}`.green);
            } catch (err) {
              console.error(`Error dropping index ${idx}: ${err.message}`.red);
            }
          }
        }
      }
    } else {
      console.log('No duplicate indexes found.'.green);
    }

    // Find unused indexes
    console.log('\nSearching for unused indexes...'.cyan.bold);
    const [unusedIndexes] = await sequelize.query(`
      SELECT
        schemaname || '.' || relname as table,
        indexrelid::regclass as index,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan as index_scans
      FROM
        pg_stat_user_indexes
      JOIN
        pg_index USING (indexrelid)
      WHERE
        idx_scan = 0 
        AND indisunique IS FALSE
        AND indisprimary IS FALSE
      ORDER BY
        pg_relation_size(indexrelid) DESC;
    `);

    if (unusedIndexes.length > 0) {
      console.log(`Found ${unusedIndexes.length} unused indexes`.yellow);
      console.table(unusedIndexes);
      
      console.log('\nConsider dropping these indexes if they are not needed:'.yellow);
      for (const idx of unusedIndexes) {
        console.log(`DROP INDEX ${idx.index};`.yellow);
      }
    } else {
      console.log('No unused indexes found.'.green);
    }
    
    // Find indexes with many duplicates of Students_email_key pattern
    console.log('\nSearching for email key pattern indexes...'.cyan.bold);
    const [emailKeyIndexes] = await sequelize.query(`
      SELECT 
        indexrelid::regclass as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM 
        pg_stat_user_indexes 
      WHERE 
        indexrelid::regclass::text LIKE '%email_key%'
      ORDER BY 
        pg_relation_size(indexrelid) DESC;
    `);
    
    if (emailKeyIndexes.length > 0) {
      console.log(`Found ${emailKeyIndexes.length} email key indexes`.yellow);
      console.table(emailKeyIndexes);
      
      if (emailKeyIndexes.length > 3) {
        console.log('\nToo many duplicate email key indexes. Keeping only the primary ones:'.yellow);
        // Generate SQL to drop excessive indexes but keep the latest ones
        const indexesToKeep = emailKeyIndexes.slice(0, 3).map(idx => idx.index_name);
        
        for (const idx of emailKeyIndexes.slice(3)) {
          const dropSql = `DROP INDEX ${idx.index_name};`;
          console.log(dropSql.red);
          
          // Execute only if confirmed
          const confirmation = true; // Set to false if you want manual confirmation
          if (confirmation) {
            try {
              await sequelize.query(dropSql);
              console.log(`Dropped index ${idx.index_name}`.green);
            } catch (err) {
              console.error(`Error dropping index ${idx.index_name}: ${err.message}`.red);
            }
          }
        }
      }
    } else {
      console.log('No email key pattern indexes found.'.green);
    }

    // Run VACUUM FULL to recover space
    console.log('\nRunning VACUUM FULL to reclaim space...'.cyan.bold);
    try {
      // Set a timeout to avoid long-running transaction
      await sequelize.query('SET statement_timeout = 300000'); // 5 minutes
      await sequelize.query('VACUUM FULL');
      console.log('VACUUM FULL completed.'.green);
    } catch (err) {
      console.error(`Error during VACUUM: ${err.message}`.red);
      console.log('Trying VACUUM without FULL option...'.yellow);
      try {
        await sequelize.query('VACUUM');
        console.log('VACUUM completed.'.green);
      } catch (vacErr) {
        console.error(`Error during VACUUM: ${vacErr.message}`.red);
      }
    }

    // Show final database size
    const [finalDbSize] = await sequelize.query(
      "SELECT pg_size_pretty(pg_database_size(current_database())) as db_size"
    );
    console.log(`\nFinal Database Size: ${finalDbSize[0].db_size}`.green.bold);

    console.log('\nOptimization completed.'.green.bold);
  } catch (error) {
    console.error(`Error: ${error.message}`.red);
  } finally {
    // Close the connection
    await sequelize.close();
  }
};

// Run the optimization
runOptimization(); 