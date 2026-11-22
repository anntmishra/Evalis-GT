const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');
const { TeachingAssignment, Teacher, Subject, Section } = require('../models');
const { academicScope, requireSubject, requireTeacher, deny } = require('../utils/academicScope');
const includes = [{ model: Teacher, attributes: ['id','name','email'] }, { model: Subject, attributes: ['id','name','batchId','semesterId'] }, { model: Section, attributes: ['id','name'] }];
const getAllAssignments = asyncHandler(async (req,res) => {
  const scope = await academicScope(req);
  res.json(await TeachingAssignment.findAll({ where: { subjectId: { [Op.in]: scope.subjectIds }, isActive: true }, include: includes, order: [['createdAt','DESC']] }));
});
const getMyAssignments = asyncHandler(async (req,res) => {
  const scope = await academicScope(req);
  res.json(await TeachingAssignment.findAll({ where: { teacherId: String(req.user.id), subjectId: { [Op.in]: scope.subjectIds }, isActive: true }, include: includes }));
});
const assignTeacher = asyncHandler(async (req,res) => {
  const { teacherId, sectionId, subjectId } = req.body;
  const sessionType = String(req.body.sessionType || 'lecture').toLowerCase();
  if (!teacherId || !sectionId || !subjectId || !['lecture','lab','tutorial'].includes(sessionType)) { res.status(400); throw new Error('Teacher, section, subject and valid session type are required'); }
  const subject = await requireSubject(req,subjectId,{manage:true});
  await requireTeacher(req,teacherId);
  const section = await Section.findOne({where:{id:sectionId,subjectId}});
  if (!section) {res.status(400);throw new Error('Section does not belong to the selected subject');}
  const existing = await TeachingAssignment.findOne({where:{teacherId,subjectId,sectionId,sessionType}});
  if (existing) { await existing.update({isActive:true}); return res.json(existing); }
  res.status(201).json(await TeachingAssignment.create({teacherId,subjectId,sectionId,sessionType,batchId:subject.batchId,semesterId:subject.semesterId,assignedBy:String(req.user.id)}));
});
const revokeAssignment = asyncHandler(async (req,res) => {
  const row=await TeachingAssignment.findByPk(req.params.id);
  if(!row){res.status(404);throw new Error('Teaching assignment not found');}
  await requireSubject(req,row.subjectId,{manage:true});
  await row.update({isActive:false});
  res.json({message:'Teaching assignment revoked'});
});
module.exports={getAllAssignments,getMyAssignments,assignTeacher,revokeAssignment};
