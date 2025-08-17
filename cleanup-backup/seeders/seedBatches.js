const { Batch } = require('../models');
const colors = require('colors');

const seedBatches = async () => {
  try {
    console.log('Seeding batches...'.yellow);
    
    // Batch data to seed
    const batches = [
      {
        id: '2023-2027',
        name: 'BTech 2023-2027',
        startYear: 2023,
        endYear: 2027,
        department: 'BTech',
        active: true
      },
      {
        id: '2022-2026',
        name: 'BTech 2022-2026',
        startYear: 2022,
        endYear: 2026,
        department: 'BTech',
        active: true
      },
      {
        id: '2021-2025',
        name: 'BTech 2021-2025',
        startYear: 2021,
        endYear: 2025,
        department: 'BTech',
        active: true
      },
      {
        id: '2020-2024',
        name: 'BTech 2020-2024',
        startYear: 2020,
        endYear: 2024,
        department: 'BTech',
        active: true
      }
    ];
    
    // For each batch, create if it doesn't exist
    for (const batchData of batches) {
      const [batch, created] = await Batch.findOrCreate({
        where: { id: batchData.id },
        defaults: batchData
      });
      
      if (created) {
        console.log(`Batch ${batch.id} created successfully`.green);
      } else {
        console.log(`Batch ${batch.id} already exists`.yellow);
      }
    }
    
    console.log('Batch seeding completed'.green);
    
  } catch (error) {
    console.error('Error seeding batches:'.red, error.message);
  }
};

module.exports = seedBatches; 