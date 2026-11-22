const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');
const { Section, Subject, Teacher } = require('../models');
const { academicScope, requireSubject, requireTeacher } = require('../utils/academicScope');
const getSections = asyncHandler(async (req,res) => {
  const scope=await academicScope(req);
  if(req.query.subjectId) await requireSubject(req,req.query.subjectId);
  res.json(await Section.findAll({where:{subjectId:req.query.subjectId || {[Op.in]:scope.subjectIds}},include:[{model:Subject,attributes:['id','name']},{model:Teacher,attributes:['id','name','email']}]}));
});
const createSection = asyncHandler(async(req,res)=>{
  const {name,capacity,subjectId,teacherId}=req.body;
  if(!name||!subjectId){res.status(400);throw new Error('Name and subject are required');}
  const subject=await requireSubject(req,subjectId,{manage:true});
  if(teacherId)await requireTeacher(req,teacherId);
  res.status(201).json(await Section.create({name,capacity,subjectId,semesterId:subject.semesterId,teacherId:teacherId||null}));
});
module.exports={getSections,createSection};
