#!/usr/bin/env node

/**
 * Migration script to create the redemption_history table
 */

const { sequelize } = require('../config/db');
const RedemptionHistory = require('../models/redemptionHistoryModel');

async function createRedemptionHistoryTable() {
  try {
    console.log('🔄 Creating redemption_history table...');
    
    // Drop table if it exists to avoid enum conflicts
    await sequelize.query('DROP TABLE IF EXISTS "redemption_history";');
    console.log('✅ Dropped existing table (if any)');
    
    // Create the table with the new schema
    await RedemptionHistory.sync({ force: true });
    console.log('✅ Created redemption_history table successfully');
    
    // Verify table creation
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'redemption_history';
    `);
    
    console.log('📋 Table schema:');
    results.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  createRedemptionHistoryTable()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createRedemptionHistoryTable;
