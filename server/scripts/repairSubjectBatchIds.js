/*
 * One-off repair script: set batchId on subjects that should belong to an existing batch.
 * Usage: node server/scripts/repairSubjectBatchIds.js <BATCH_ID> [subjectIds CSV]
 */
require('dotenv').config();
const { Subject, Batch, sequelize } = require('../models');

(async () => {
  try {
    const batchId = process.argv[2];
    if (!batchId) {
      console.log('Provide batchId. Example: node server/scripts/repairSubjectBatchIds.js TB2025 CS101,CS102');
      return;
    }
    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      console.error('Batch not found:', batchId);
      return;
    }
    const idsArg = process.argv[3];
    let subjects;
    if (idsArg) {
      const ids = idsArg.split(',').map(s => s.trim()).filter(Boolean);
      subjects = await Subject.findAll({ where: { id: ids } });
    } else {
      subjects = await Subject.findAll({ where: { batchId: null } });
    }
    if (!subjects.length) {
      console.log('No subjects to update.');
      return;
    }
    let updated = 0;
    for (const subj of subjects) {
      if (!subj.batchId) {
        subj.batchId = batchId;
        await subj.save();
        updated++;
        console.log('Updated subject', subj.id, '-> batchId', batchId);
      }
    }
    console.log('Repair complete. Updated', updated, 'subjects.');
  } catch (e) {
    console.error('Repair failed:', e.message);
  } finally {
    await sequelize.close();
  }
})();
