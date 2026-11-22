const asyncHandler = require('express-async-handler');
const { Program, School, Department, Batch } = require('../models');
const { Op } = require('sequelize');
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
async function parent(req, schoolId, departmentId) {
  const school = await School.findOne({ where: { id: schoolId, tenantId: req.tenantId } });
  if (!school) throw fail('School not found in your institution', 404);
  if (departmentId) { const department = await Department.findOne({ where: { id: departmentId, schoolId } }); if (!department) throw fail('Department does not belong to this school'); }
  return school;
}
exports.getPrograms = asyncHandler(async (req, res) => {
  const schools = await School.findAll({ where: { tenantId: req.tenantId }, attributes: ['id'] });
  const ids = schools.map(row => row.id);
  const schoolId = req.query.schoolId;
  res.json(await Program.findAll({ where: { schoolId: schoolId ? ids.includes(schoolId) ? schoolId : { [Op.in]: [] } : { [Op.in]: ids } }, include: [{ model: Department, attributes: ['id','name','schoolId'] }], order: [['name', 'ASC']] }));
});
exports.createProgram = asyncHandler(async (req, res) => {
  const { name, code, description, schoolId, departmentId } = req.body;
  if (!name?.trim() || !code?.trim() || !schoolId) throw fail('Program name, code and school are required');
  await parent(req, schoolId, departmentId);
  const normalizedCode = code.trim().toUpperCase();
  if (await Program.findOne({ where: { code: normalizedCode } })) throw fail('Program code already exists', 409);
  res.status(201).json(await Program.create({ name: name.trim(), code: normalizedCode, description: description || '', schoolId, departmentId: departmentId || null }));
});
exports.updateProgram = asyncHandler(async (req, res) => {
  const program = await Program.findByPk(req.params.id); if (!program) throw fail('Program not found', 404);
  await parent(req, program.schoolId);
  const schoolId = req.body.schoolId || program.schoolId, departmentId = req.body.departmentId === undefined ? program.departmentId : req.body.departmentId || null;
  await parent(req, schoolId, departmentId);
  const updates = {}; for (const key of ['name','code','description','isActive']) if (req.body[key] !== undefined) updates[key] = req.body[key];
  if (updates.code) updates.code = String(updates.code).trim().toUpperCase();
  res.json(await program.update({ ...updates, schoolId, departmentId }));
});
exports.deleteProgram = asyncHandler(async (req, res) => {
  const program = await Program.findByPk(req.params.id); if (!program) throw fail('Program not found', 404);
  await parent(req, program.schoolId);
  if (await Batch.count({ where: { programId: program.id } })) throw fail('Move or remove this programme’s academic sessions first', 409);
  await program.destroy(); res.json({ message: 'Programme removed' });
});
