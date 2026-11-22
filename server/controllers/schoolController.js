const asyncHandler = require('express-async-handler');
const { School, Department, Program } = require('../models');
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
exports.getSchools = asyncHandler(async (req, res) => {
  res.json(await School.findAll({ where: { tenantId: req.tenantId }, order: [['name', 'ASC']] }));
});
exports.createSchool = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim(), code = String(req.body.code || '').trim().toUpperCase();
  if (!name || !code) throw fail('School name and code are required');
  if (await School.findOne({ where: { code } })) throw fail('School code already exists', 409);
  res.status(201).json(await School.create({ name, code, tenantId: req.tenantId }));
});
exports.deleteSchool = asyncHandler(async (req, res) => {
  const school = await School.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!school) throw fail('School not found', 404);
  if (await Department.count({ where: { schoolId: school.id } }) || await Program.count({ where: { schoolId: school.id } })) throw fail('Move or remove this school’s departments and programmes first', 409);
  await school.destroy(); res.json({ message: 'School removed' });
});
