const { sequelize } = require('../config/db');

async function inspect() {
  try {
    await sequelize.authenticate();
    const qi = sequelize.getQueryInterface();
    const tables = ['Timetables', 'TimetableSlots'];
    for (const table of tables) {
      try {
        const description = await qi.describeTable(table);
        console.log(`\n=== ${table} ===`);
        console.table(description);
      } catch (err) {
        console.error(`Failed to describe ${table}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    await sequelize.close();
  }
}

inspect();
