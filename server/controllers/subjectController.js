const asyncHandler = require('express-async-handler');
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { Subject, Teacher, TeachingAssignment, Batch, Semester, Assignment, Submission, Quiz } = require('../models');
const { academicScope, requireSubject, deny } = require('../utils/academicScope');
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const includes = [{ model: Teacher, attributes: ['id','name','email'], through: { attributes: [] } }, { model: Batch }, { model: Semester }];
async function subjects(req, filter = {}) { const scope = await academicScope(req); return Subject.findAll({ where: { ...filter, id: { [Op.in]: scope.subjectIds } }, include: includes, order: [['name','ASC']] }); }
const getSubjects = asyncHandler(async (req, res) => res.json(await subjects(req)));
const getSubjectById = asyncHandler(async (req, res) => { await requireSubject(req, req.params.id); const row = await Subject.findByPk(req.params.id, { include: includes }); if (!row) throw fail('Subject not found',404); res.json(row); });
async function parent(req, batchId, semesterId) {
  const scope = await academicScope(req);
  const semester = semesterId ? await Semester.findByPk(semesterId) : null;
  if (semesterId && !semester) throw fail('Semester not found',404);
  const id = semester?.batchId || batchId;
  if (!id || !scope.batchIds.includes(id) || batchId && batchId !== id) throw deny('Batch outside your institution or academic scope');
  const finalSemester = semester || await Semester.findOne({ where: { batchId: id }, order: [['number','ASC']] });
  return { batchId: id, semesterId: finalSemester?.id || null };
}
const createSubject = asyncHandler(async (req, res) => {
  const { id, name, section, description, credits } = req.body;
  if (!String(name||'').trim() || !String(section||'').trim()) throw fail('Subject name and section are required');
  const relation = await parent(req, req.body.batchId, req.body.semesterId);
  const subjectId = id || `SUB-${Date.now().toString(36).toUpperCase()}`;
  if (await Subject.findByPk(subjectId)) throw fail('Subject ID already exists',409);
  const row = await Subject.create({ id: subjectId, name: name.trim(), section: section.trim(), description: description || '', credits: credits == null ? 3 : Number(credits), ...relation });
  res.status(201).json(await Subject.findByPk(row.id,{include:includes}));
});
const updateSubject = asyncHandler(async (req, res) => {
  const row = await requireSubject(req, req.params.id);
  const relation = req.body.batchId !== undefined || req.body.semesterId !== undefined ? await parent(req, req.body.batchId || row.batchId, req.body.semesterId || null) : {};
  const fields = {};for(const key of ['name','section','description','credits'])if(req.body[key]!==undefined)fields[key]=req.body[key];
  await row.update({...fields,...relation}); res.json(await Subject.findByPk(row.id,{include:includes}));
});
const deleteSubject = asyncHandler(async (req, res) => {
  const row = await requireSubject(req, req.params.id);
  if (await Assignment.count({ where: { subjectId: row.id } }) || await Submission.count({ where: { subjectId: row.id, tenantId: req.tenantId } }) || await Quiz.count({ where: { subjectId: row.id, tenantId: req.tenantId } })) throw fail('This subject has assessments or submissions and cannot be deleted',409);
  await TeachingAssignment.destroy({ where: { subjectId: row.id } }); await row.destroy();res.json({message:'Subject removed'});
});
const getSubjectsBySection = asyncHandler(async (req,res)=>res.json(await subjects(req,{section:req.params.sectionId})));
const getSubjectsByBatch = asyncHandler(async (req,res)=>res.json(await subjects(req,{batchId:req.params.batchId})));
const getSubjectsBySemester = asyncHandler(async (req,res)=>res.json(await subjects(req,{semesterId:req.params.semesterId})));
const importSubjectsFromExcel = asyncHandler(async (req,res)=>{
  if(!req.file)throw fail('Please upload an Excel file');
  const workbook=XLSX.read(req.file.buffer,{type:'buffer'});const rows=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  if(!rows.length)throw fail('Spreadsheet has no rows');
  const created=[];const errors=[];
  for(let i=0;i<rows.length;i++){try{const row=rows[i];const relation=await parent(req,row.batchId?.toString(),row.semesterId?.toString());if(!row.id||!row.name||!row.section)throw fail('ID, name and section required');created.push(await Subject.create({id:String(row.id),name:String(row.name),section:String(row.section),credits:row.credits?Number(row.credits):3,type:row.type||'Core',...relation}));}catch(error){errors.push(`Row ${i+2}: ${error.message}`);}}
  res.status(201).json({message:`Imported ${created.length} subjects`,importedCount:created.length,errors});
});
module.exports={getSubjects,getSubjectById,createSubject,updateSubject,deleteSubject,getSubjectsBySection,getSubjectsByBatch,getSubjectsBySemester,importSubjectsFromExcel};
