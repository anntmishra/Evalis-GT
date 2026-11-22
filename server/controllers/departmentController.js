const asyncHandler = require('express-async-handler');
const { Department, UserRoleAssignment, School, Program } = require('../models');
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const getDepartments = asyncHandler(async (req, res) => {
  res.json(await Department.findAll({ include: [{ model: School, required: true, where: { tenantId: req.tenantId }, attributes: ['id', 'name'] }, { model: UserRoleAssignment, as: 'HODs', required: false, where: { role: 'hod', status: 'active', tenantId: req.tenantId }, attributes: ['id','userId','teacherId','role'] }], order: [['name', 'ASC']] }));
});
const createDepartment = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim(), code = String(req.body.code || '').trim().toUpperCase(), schoolId = req.body.schoolId;
  if (!name || !code || !schoolId) throw fail('Department name, code and school are required');
  const school = await School.findOne({ where: { id: schoolId, tenantId: req.tenantId } });
  if (!school) throw fail('School not found in your institution', 404);
  if (await Department.findOne({ where: { code } })) throw fail('Department code already exists', 409);
  res.status(201).json(await Department.create({ name, code, description: req.body.description || '', schoolId }));
});
const createProgram = asyncHandler(async (req, res) => {
  const department = await Department.findByPk(req.params.id, { include: [{ model: School, required: true, where: { tenantId: req.tenantId } }] });
  if (!department) throw fail('Department not found in your institution', 404);
  const name = String(req.body.name || '').trim(), code = String(req.body.code || '').trim().toUpperCase();
  if (!name || !code) throw fail('Program name and code are required');
  if (await Program.findOne({ where: { code } })) throw fail('Program code already exists', 409);
  res.status(201).json(await Program.create({ name, code, description: req.body.description || '', schoolId: department.schoolId, departmentId: department.id }));
});
module.exports = { getDepartments, createDepartment, createProgram };
