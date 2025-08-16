const { Semester } = require('../models');
const colors = require('colors');

const seedSemesters = async () => {
  try {
    console.log('Seeding semesters...'.yellow);
    
    // Batch IDs that we created
    const batchIds = ['2023-2027', '2022-2026', '2021-2025', '2020-2024'];
    
    // Create 8 semesters for each batch (typical BTech program)
    for (const batchId of batchIds) {
      for (let semesterNumber = 1; semesterNumber <= 8; semesterNumber++) {
        // Calculate start and end dates based on batch start year and semester number
        const batchStartYear = parseInt(batchId.split('-')[0]);
        const yearOffset = Math.floor((semesterNumber - 1) / 2);
        const isOddSemester = semesterNumber % 2 === 1;
        
        const startDate = new Date(batchStartYear + yearOffset, isOddSemester ? 7 : 0, 1); // Aug 1 for odd, Jan 1 for even
        const endDate = new Date(batchStartYear + yearOffset, isOddSemester ? 11 : 5, isOddSemester ? 31 : 30); // Dec 31 for odd, Jun 30 for even
        
        const semesterData = {
          id: `${batchId}-SEM-${semesterNumber}`,
          number: semesterNumber,
          name: `Semester ${semesterNumber}`,
          startDate: startDate,
          endDate: endDate,
          batchId: batchId,
          active: semesterNumber <= 4 // Keep first 4 semesters active by default
        };
        
        const [semester, created] = await Semester.findOrCreate({
          where: { 
            id: semesterData.id
          },
          defaults: semesterData
        });
        
        if (created) {
          console.log(`Semester ${semesterNumber} for batch ${batchId} created successfully`.green);
        } else {
          console.log(`Semester ${semesterNumber} for batch ${batchId} already exists`.yellow);
        }
      }
    }
    
    console.log('Semester seeding completed'.green);
    
  } catch (error) {
    console.error('Error seeding semesters:'.red, error.message);
    throw error;
  }
};

module.exports = seedSemesters;
