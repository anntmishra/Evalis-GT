const { Op, Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const {
  Timetable,
  TimetableSlot,
  Subject,
  Teacher,
  Semester,
  Student,
  Batch,
  sequelize
} = require('../models');

const DEFAULT_DAYS = [
  { index: 0, name: 'Monday' },
  { index: 1, name: 'Tuesday' },
  { index: 2, name: 'Wednesday' },
  { index: 3, name: 'Thursday' },
  { index: 4, name: 'Friday' }
];

const DEFAULT_SLOTS = [
  { slotIndex: 0, startTime: '09:00', endTime: '09:50', label: 'Morning 1' },
  { slotIndex: 1, startTime: '10:00', endTime: '10:50', label: 'Morning 2' },
  { slotIndex: 2, startTime: '11:00', endTime: '11:50', label: 'Pre-Lunch' },
  { slotIndex: 3, startTime: '12:30', endTime: '13:20', label: 'Post-Lunch' },
  { slotIndex: 4, startTime: '13:30', endTime: '14:20', label: 'Afternoon 1' },
  { slotIndex: 5, startTime: '14:30', endTime: '15:20', label: 'Afternoon 2' },
  { slotIndex: 6, startTime: '15:30', endTime: '16:20', label: 'Evening 1' }
];

<<<<<<< HEAD
const SUBJECT_COLOR_PALETTE = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#9333ea', '#b91c1c'];

function normalizeDays(days = DEFAULT_DAYS) {
  if (!Array.isArray(days)) return DEFAULT_DAYS;
  return days.map((day, index) => {
    if (typeof day === 'string') {
      return { index, name: day };
    }
    if (typeof day === 'object' && day !== null) {
      return {
        index: Number.isFinite(day.index) ? day.index : index,
        name: day.name || DEFAULT_DAYS[index]?.name || `Day ${index + 1}`
      };
    }
    return { index, name: DEFAULT_DAYS[index]?.name || `Day ${index + 1}` };
  });
}

function normalizeSlots(slots = DEFAULT_SLOTS) {
  if (!Array.isArray(slots)) return DEFAULT_SLOTS;
  return slots.map((slot, index) => {
    if (typeof slot === 'object' && slot !== null) {
      return {
        slotIndex: Number.isFinite(slot.slotIndex) ? slot.slotIndex : index,
        startTime: slot.startTime || DEFAULT_SLOTS[index]?.startTime,
        endTime: slot.endTime || DEFAULT_SLOTS[index]?.endTime,
        label: slot.label || DEFAULT_SLOTS[index]?.label || `Slot ${index + 1}`
      };
    }
    return DEFAULT_SLOTS[index] || {
      slotIndex: index,
      startTime: '09:00',
      endTime: '09:50',
      label: `Slot ${index + 1}`
    };
  });
}

function resolveDayDefinition(timetable, dayOfWeek) {
  const dayIndex = Number(dayOfWeek);
  const days = normalizeDays(timetable?.metadata?.days || DEFAULT_DAYS);
  return days.find(day => Number(day.index) === dayIndex) || DEFAULT_DAYS.find(day => day.index === dayIndex);
}

function resolveSlotDefinition(timetable, slotIndex) {
  const index = Number(slotIndex);
  const slots = normalizeSlots(timetable?.metadata?.slots || DEFAULT_SLOTS);
  return slots.find(slot => Number(slot.slotIndex) === index) || DEFAULT_SLOTS.find(slot => slot.slotIndex === index);
}

async function getOrAssignSubjectColor({ timetableId, subjectId, transaction }) {
  const existingColor = await TimetableSlot.findOne({
    where: { timetableId, subjectId, color: { [Op.ne]: null } },
    attributes: ['color'],
    order: [['createdAt', 'ASC']],
    transaction
  });

  if (existingColor?.color) {
    return existingColor.color;
  }

  const slots = await TimetableSlot.findAll({
    where: { timetableId },
    attributes: ['color'],
    transaction
  });

  const usedColors = new Set(slots.map(slot => slot.color).filter(Boolean));
  const availableColor = SUBJECT_COLOR_PALETTE.find(color => !usedColors.has(color));
  if (availableColor) return availableColor;
  return SUBJECT_COLOR_PALETTE[usedColors.size % SUBJECT_COLOR_PALETTE.length];
}

async function validateSubjectAndTeacher({ timetable, subjectId, teacherId, transaction }) {
  const subject = await Subject.findByPk(subjectId, {
    include: [{ model: Teacher, through: { attributes: [] } }],
    transaction
  });
  if (!subject) throw new Error('Subject not found');

  if (timetable.semesterId && subject.semesterId && subject.semesterId !== timetable.semesterId) {
    throw new Error('Subject belongs to a different semester');
  }

  if (timetable.batchId && subject.batchId && subject.batchId !== timetable.batchId) {
    throw new Error('Subject belongs to a different batch');
  }

  const teacher = await Teacher.findByPk(teacherId, { transaction });
  if (!teacher) throw new Error('Teacher not found');

  const subjectTeachers = subject.Teachers || subject.dataValues?.Teachers || [];
  const teacherMatchesSubject = subjectTeachers.some(t => String(t.id) === String(teacherId));

  return { subject, teacher, teacherMatchesSubject };
}

=======
>>>>>>> 49762404994bfa5a6c0729878ee8a2e4a67b2e95
function buildSessionNodes(subjects, options = {}) {
  const sessions = [];
  subjects.forEach(subject => {
    const {
      id,
      name,
      section,
      credits,
      Teachers: subjectTeachers = []
    } = subject;

    const metadata = subject.metadata || subject.dataValues?.metadata || {};

    const sessionsPerWeek = metadata.sessionsPerWeek || credits || options.defaultSessionsPerWeek || 3;
    const durationSlots = metadata.durationSlots || 1;
    const teacher = metadata.overrideTeacherId
      ? subjectTeachers.find(t => t.id === metadata.overrideTeacherId)
      : subjectTeachers[0];

    if (!teacher) {
      sessions.push({
        id: `${id}-unassigned-${sessions.length}`,
        subjectId: id,
        subjectName: name,
        section,
        teacherId: null,
        teacherName: null,
        durationSlots,
        sessionsPerWeek,
        priority: 0,
        unscheduled: true,
        reason: 'No teacher assigned'
      });
      return;
    }

  for (let i = 0; i < sessionsPerWeek; i += 1) {
      sessions.push({
        id: `${id}-session-${i}`,
        subjectId: id,
        subjectName: name,
        section,
        teacherId: teacher.id,
        teacherName: teacher.name,
        durationSlots,
        sessionsPerWeek,
        priority: metadata.priority || credits || sessionsPerWeek,
        unscheduled: false
      });
    }
  });

  return sessions;
}

function buildAdjacency(sessions) {
  const adjacency = new Map();
  sessions.forEach(session => adjacency.set(session.id, new Set()));

  for (let i = 0; i < sessions.length; i += 1) {
    for (let j = i + 1; j < sessions.length; j += 1) {
      const a = sessions[i];
      const b = sessions[j];
      const shareTeacher = a.teacherId && b.teacherId && a.teacherId === b.teacherId;
      const shareSection = a.section && b.section && a.section === b.section;
      const shareSubject = a.subjectId === b.subjectId;

      if (shareTeacher || shareSection || shareSubject) {
        adjacency.get(a.id).add(b.id);
        adjacency.get(b.id).add(a.id);
      }
    }
  }

  return adjacency;
}

function runMessagePassing(adjacency, sessions, iterations = 3) {
  const embeddings = new Map();
  sessions.forEach(session => {
    const base = session.priority || 1;
    embeddings.set(session.id, [base, 1, session.sessionsPerWeek || 1]);
  });

  for (let iter = 0; iter < iterations; iter += 1) {
    const updated = new Map();
    sessions.forEach(session => {
      const neighbors = adjacency.get(session.id) || new Set();
      let sumPriority = 0;
      let conflictCount = 0;
      neighbors.forEach(neighborId => {
        const [priority] = embeddings.get(neighborId) || [0];
        sumPriority += priority;
        conflictCount += 1;
      });

      const [selfPriority, , selfLoad] = embeddings.get(session.id);
      const newPriority = Math.max(1, selfPriority + (sumPriority / Math.max(1, conflictCount)) * 0.2);
      const newConflict = conflictCount;
      updated.set(session.id, [newPriority, newConflict, selfLoad]);
    });
    updated.forEach((value, key) => embeddings.set(key, value));
  }

  return embeddings;
}

function buildSlotTemplates(days = DEFAULT_DAYS, slots = DEFAULT_SLOTS) {
  const templates = [];
  days.forEach(day => {
    slots.forEach(slot => {
      templates.push({
        dayOfWeek: day.index,
        dayName: day.name,
        slotIndex: slot.slotIndex,
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.label,
        slotKey: `${day.index}-${slot.slotIndex}`
      });
    });
  });
  return templates;
}

function scoreSlot({ session, slot, embeddings, teacherAvailability, sectionAvailability, adjacency, scheduled }) {
  const [priority, neighborConflicts] = embeddings.get(session.id) || [1, 0];
  const slotKey = slot.slotKey;

  const teacherBusy = teacherAvailability.get(session.teacherId)?.has(slotKey);
  const sectionBusy = sectionAvailability.get(session.section)?.has(slotKey);
  const alreadyScheduledNeighbor = Array.from(adjacency.get(session.id) || []).some(neighborId => {
    const neighborSlots = scheduled.get(neighborId);
    return neighborSlots ? neighborSlots.has(slotKey) : false;
  });

  let score = priority * 10;
  if (teacherBusy) score -= 25;
  if (sectionBusy) score -= 20;
  if (alreadyScheduledNeighbor) score -= 15;
  score -= neighborConflicts * 2;

  return score;
}

async function generateTimetable(options) {
  const {
    semesterId,
    batchId,
    generatedBy,
    days = DEFAULT_DAYS,
    slots = DEFAULT_SLOTS,
    dryRun = false,
    name,
    metadataOverrides = {}
  } = options;

  if (!semesterId) {
    throw new Error('semesterId is required to generate a timetable');
  }

  const semester = await Semester.findByPk(semesterId, {
    include: [{ model: Batch, as: 'Batch' }]
  });

  if (!semester) {
    throw new Error('Semester not found');
  }

  const subjects = await Subject.findAll({
    where: {
      semesterId,
      ...(batchId ? { batchId } : {})
    },
    include: [{
      model: Teacher,
      through: { attributes: [] }
    }]
  });

  if (!subjects.length) {
    throw new Error('No subjects found for the selected semester');
  }

  const sessions = buildSessionNodes(subjects, metadataOverrides);
  const adjacency = buildAdjacency(sessions);
  const embeddings = runMessagePassing(adjacency, sessions);
  const slotTemplates = buildSlotTemplates(days, slots);

  const teacherAvailability = new Map();
  const sectionAvailability = new Map();
  const scheduledSlots = new Map();
  const allocatedSlots = [];
  const unscheduled = [];

  sessions
    .filter(session => !session.unscheduled)
    .sort((a, b) => {
      const [priorityA, conflictsA] = embeddings.get(a.id);
      const [priorityB, conflictsB] = embeddings.get(b.id);
      if (priorityA !== priorityB) return priorityB - priorityA;
      return conflictsA - conflictsB;
    })
    .forEach(session => {
      const availableScoredSlots = slotTemplates
        .filter(slot => session.durationSlots === 1 || slot.slotIndex <= DEFAULT_SLOTS.length - session.durationSlots)
        .map(slot => ({ slot, score: scoreSlot({ session, slot, embeddings, teacherAvailability, sectionAvailability, adjacency, scheduled: scheduledSlots }) }))
        .sort((a, b) => b.score - a.score);

      const chosen = availableScoredSlots.find(candidate => candidate.score > -Infinity);

      if (!chosen || chosen.score < 0) {
        unscheduled.push({ session, reason: 'No feasible slot found', bestScore: chosen ? chosen.score : null });
        return;
      }

      const { slot } = chosen;
      const slotIds = [];
      for (let offset = 0; offset < session.durationSlots; offset += 1) {
        const slotTemplate = slotTemplates.find(t => t.dayOfWeek === slot.dayOfWeek && t.slotIndex === slot.slotIndex + offset);
        if (!slotTemplate) {
          unscheduled.push({ session, reason: 'Insufficient contiguous slots for session duration' });
          return;
        }
        slotIds.push(slotTemplate);
      }

      slotIds.forEach(slotTemplate => {
        const slotKey = slotTemplate.slotKey;
        if (!teacherAvailability.has(session.teacherId)) teacherAvailability.set(session.teacherId, new Set());
        if (!sectionAvailability.has(session.section)) sectionAvailability.set(session.section, new Set());
        if (!scheduledSlots.has(session.id)) scheduledSlots.set(session.id, new Set());

        teacherAvailability.get(session.teacherId).add(slotKey);
        sectionAvailability.get(session.section).add(slotKey);
        scheduledSlots.get(session.id).add(slotKey);

        allocatedSlots.push({
          id: uuidv4(),
          sessionId: session.id,
          timetableId: null, // placeholder until persisted
          semesterId,
          subjectId: session.subjectId,
          teacherId: session.teacherId,
          section: session.section,
          dayOfWeek: slotTemplate.dayOfWeek,
          dayName: slotTemplate.dayName,
          slotIndex: slotTemplate.slotIndex,
          startTime: slotTemplate.startTime,
          endTime: slotTemplate.endTime,
          sessionLabel: slotTemplate.label,
          color: undefined
        });
      });
    });

<<<<<<< HEAD
  const colorMap = new Map();
  allocatedSlots.forEach(slot => {
    if (!colorMap.has(slot.subjectId)) {
      colorMap.set(slot.subjectId, SUBJECT_COLOR_PALETTE[colorMap.size % SUBJECT_COLOR_PALETTE.length]);
=======
  const palette = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#9333ea', '#b91c1c'];
  const colorMap = new Map();
  allocatedSlots.forEach(slot => {
    if (!colorMap.has(slot.subjectId)) {
      colorMap.set(slot.subjectId, palette[colorMap.size % palette.length]);
>>>>>>> 49762404994bfa5a6c0729878ee8a2e4a67b2e95
    }
    slot.color = colorMap.get(slot.subjectId);
  });

  const metrics = {
    requestedSessions: sessions.filter(s => !s.unscheduled).length,
    scheduledSessions: new Set(allocatedSlots.map(s => s.sessionId)).size,
    slotCount: allocatedSlots.length,
    unscheduledSessions: unscheduled.length,
    generatedAt: new Date().toISOString(),
    generationStrategy: 'gnn-message-passing-v1'
  };

  const timetableData = {
    name: name || `${semester.name} - AI Timetable ${new Date().toLocaleDateString()}`,
    semesterId,
    batchId: batchId || semester.batchId,
    generatedBy,
    status: metrics.unscheduledSessions === 0 ? 'draft' : 'draft',
    generationMethod: 'gnn',
    metadata: {
      days,
      slots,
      unscheduled,
      options: metadataOverrides
    },
    metrics
  };

  if (dryRun) {
    return {
      timetable: timetableData,
      slots: allocatedSlots,
      unscheduled,
      metrics
    };
  }

  return sequelize.transaction(async transaction => {
    const timetable = await Timetable.create(timetableData, { transaction });
    const slotsToPersist = allocatedSlots.map(slot => ({
      ...slot,
      timetableId: timetable.id,
      info: {
        sessionId: slot.sessionId,
        generationScore: 1,
        algorithm: 'gnn-message-passing-v1'
      }
    }));

    await TimetableSlot.bulkCreate(slotsToPersist, { transaction });

    return {
      timetable: timetable.get({ plain: true }),
      slots: slotsToPersist,
      unscheduled,
      metrics
    };
  });
}

<<<<<<< HEAD
async function createManualTimetableSlot(timetableId, payload) {
  const {
    dayOfWeek,
    slotIndex,
    subjectId,
    teacherId,
    section,
    sessionLabel,
    color,
    info = {}
  } = payload || {};

  if (dayOfWeek === undefined || slotIndex === undefined || !subjectId || !teacherId) {
    throw new Error('dayOfWeek, slotIndex, subjectId, and teacherId are required');
  }

  return sequelize.transaction(async transaction => {
    const timetable = await Timetable.findByPk(timetableId, { transaction });
    if (!timetable) throw new Error('Timetable not found');

    const existing = await TimetableSlot.findOne({
      where: { timetableId, dayOfWeek, slotIndex },
      transaction
    });
    if (existing) {
      throw new Error('Slot already has a class scheduled. Remove it before adding another.');
    }

    const dayDefinition = resolveDayDefinition(timetable, dayOfWeek);
    if (!dayDefinition) throw new Error('Invalid dayOfWeek value');
    const slotDefinition = resolveSlotDefinition(timetable, slotIndex);
    if (!slotDefinition) throw new Error('Invalid slotIndex value');

    const { subject, teacher, teacherMatchesSubject } = await validateSubjectAndTeacher({
      timetable,
      subjectId,
      teacherId,
      transaction
    });

    const slotColor = color || await getOrAssignSubjectColor({ timetableId, subjectId, transaction });

    const created = await TimetableSlot.create({
      timetableId,
      subjectId,
      teacherId,
      semesterId: timetable.semesterId || subject.semesterId || null,
      section: section ?? subject.section ?? null,
      dayOfWeek,
      dayName: dayDefinition.name,
      slotIndex,
      startTime: slotDefinition.startTime,
      endTime: slotDefinition.endTime,
      sessionLabel: sessionLabel || slotDefinition.label || null,
      color: slotColor,
      info: {
        ...(info || {}),
        manual: true,
        teacherMatchesSubject,
        addedAt: new Date().toISOString()
      }
    }, { transaction });

    return TimetableSlot.findByPk(created.id, {
      include: [
        { model: Subject, as: 'subject' },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'email'] }
      ],
      transaction
    });
  });
}

async function updateManualTimetableSlot(timetableId, slotId, updates = {}) {
  return sequelize.transaction(async transaction => {
    const slot = await TimetableSlot.findByPk(slotId, {
      include: [{ model: Timetable, as: 'timetable' }],
      transaction
    });

    if (!slot || Number(slot.timetableId) !== Number(timetableId)) {
      throw new Error('Timetable slot not found');
    }

    const timetable = slot.timetable || await Timetable.findByPk(slot.timetableId, { transaction });

    const nextDay = updates.dayOfWeek !== undefined ? updates.dayOfWeek : slot.dayOfWeek;
    const nextSlotIndex = updates.slotIndex !== undefined ? updates.slotIndex : slot.slotIndex;

    if (updates.dayOfWeek !== undefined || updates.slotIndex !== undefined) {
      const conflict = await TimetableSlot.findOne({
        where: {
          timetableId: slot.timetableId,
          dayOfWeek: nextDay,
          slotIndex: nextSlotIndex,
          id: { [Op.ne]: slot.id }
        },
        transaction
      });

      if (conflict) {
        throw new Error('Another class is already scheduled during this time');
      }

      const dayDefinition = resolveDayDefinition(timetable, nextDay);
      if (!dayDefinition) throw new Error('Invalid dayOfWeek value');
      const slotDefinition = resolveSlotDefinition(timetable, nextSlotIndex);
      if (!slotDefinition) throw new Error('Invalid slotIndex value');

      slot.dayOfWeek = nextDay;
      slot.slotIndex = nextSlotIndex;
      slot.dayName = dayDefinition.name;
      slot.startTime = slotDefinition.startTime;
      slot.endTime = slotDefinition.endTime;
      if (updates.sessionLabel === undefined) {
        slot.sessionLabel = slot.sessionLabel || slotDefinition.label || null;
      }
    }

    let teacherValidation;
    if (updates.subjectId !== undefined || updates.teacherId !== undefined) {
      const nextSubjectId = updates.subjectId !== undefined ? updates.subjectId : slot.subjectId;
      const nextTeacherId = updates.teacherId !== undefined ? updates.teacherId : slot.teacherId;
      teacherValidation = await validateSubjectAndTeacher({
        timetable,
        subjectId: nextSubjectId,
        teacherId: nextTeacherId,
        transaction
      });

      slot.subjectId = nextSubjectId;
      slot.teacherId = nextTeacherId;
      slot.section = updates.section !== undefined ? updates.section : (slot.section ?? teacherValidation.subject.section ?? null);
      slot.semesterId = timetable.semesterId || teacherValidation.subject.semesterId || null;

      if (updates.color === undefined) {
        slot.color = slot.color || await getOrAssignSubjectColor({ timetableId: slot.timetableId, subjectId: nextSubjectId, transaction });
      }
    }

    if (updates.section !== undefined && (updates.subjectId === undefined && updates.teacherId === undefined)) {
      slot.section = updates.section;
    }

    if (updates.sessionLabel !== undefined) {
      slot.sessionLabel = updates.sessionLabel || null;
    }

    if (updates.color !== undefined) {
      slot.color = updates.color || null;
    }

    const currentInfo = slot.info || {};
    slot.info = {
      ...currentInfo,
      ...(updates.info || {}),
      manual: true,
      updatedAt: new Date().toISOString(),
      teacherMatchesSubject: teacherValidation?.teacherMatchesSubject ?? currentInfo.teacherMatchesSubject
    };

    await slot.save({ transaction });

    return TimetableSlot.findByPk(slot.id, {
      include: [
        { model: Subject, as: 'subject' },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'email'] }
      ],
      transaction
    });
  });
}

async function removeManualTimetableSlot(timetableId, slotId) {
  return sequelize.transaction(async transaction => {
    const slot = await TimetableSlot.findOne({
      where: { id: slotId, timetableId },
      transaction
    });
    if (!slot) throw new Error('Timetable slot not found');
    await slot.destroy({ transaction });
  });
}

=======
>>>>>>> 49762404994bfa5a6c0729878ee8a2e4a67b2e95
async function listTimetables({ semesterId, batchId, status, includeSlots = false }) {
  const where = {};
  if (semesterId) where.semesterId = semesterId;
  if (batchId) where.batchId = batchId;
  if (status) where.status = status;

  const include = [];
  if (includeSlots) {
    include.push({
      model: TimetableSlot,
      as: 'slots',
      include: [
        { model: Subject, as: 'subject' },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'email'] }
      ]
    });
  }

  return Timetable.findAll({
    where,
    include,
    order: [['updatedAt', 'DESC']]
  });
}

async function getTimetableById(id) {
  const timetable = await Timetable.findByPk(id, {
    include: [{
      model: TimetableSlot,
      as: 'slots',
      include: [
        { model: Subject, as: 'subject' },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'email'] }
      ],
      order: [
        ['dayOfWeek', 'ASC'],
        ['slotIndex', 'ASC']
      ]
    }]
  });

  if (!timetable) {
    throw new Error('Timetable not found');
  }

  return timetable;
}

async function updateTimetableStatus(id, status) {
  const validStatuses = ['draft', 'active', 'published', 'completed', 'archived'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid timetable status');
  }

  const timetable = await Timetable.findByPk(id);
  if (!timetable) throw new Error('Timetable not found');

  timetable.status = status;
  await timetable.save();
  return timetable;
}

async function deleteTimetable(id) {
  return sequelize.transaction(async transaction => {
    await TimetableSlot.destroy({ where: { timetableId: id }, transaction });
    await Timetable.destroy({ where: { id }, transaction });
  });
}

async function getTeacherTimetable(teacherId, options = {}) {
  const { statusPreference = ['published', 'active', 'completed', 'draft'] } = options;
  const timetable = await Timetable.findOne({
    where: {
      status: { [Op.in]: statusPreference }
    },
    include: [{
      model: TimetableSlot,
      as: 'slots',
      required: true,
      where: { teacherId },
      include: [{ model: Subject, as: 'subject' }]
    }],
    order: [['status', 'ASC'], ['updatedAt', 'DESC']]
  });

  return timetable;
}

async function getStudentTimetable(studentId, options = {}) {
  const student = await Student.findByPk(studentId);
  if (!student) throw new Error('Student not found');

  const { statusPreference = ['published', 'active', 'completed', 'draft'] } = options;

  const timetable = await Timetable.findOne({
    where: {
      [Op.and]: [
        student.activeSemesterId ? { semesterId: student.activeSemesterId } : {},
        student.batch ? { batchId: student.batch } : {}
      ],
      status: { [Op.in]: statusPreference }
    },
    include: [{
      model: TimetableSlot,
      as: 'slots',
      required: true,
      where: {
        [Op.or]: [
          { section: student.section },
          { section: null }
        ]
      },
      include: [
        { model: Subject, as: 'subject' },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name'] }
      ]
    }],
    order: [['status', 'ASC'], ['updatedAt', 'DESC']]
  });

  return timetable;
}

module.exports = {
  generateTimetable,
  listTimetables,
  getTimetableById,
  updateTimetableStatus,
  deleteTimetable,
  getTeacherTimetable,
<<<<<<< HEAD
  getStudentTimetable,
  createManualTimetableSlot,
  updateManualTimetableSlot,
  removeManualTimetableSlot
=======
  getStudentTimetable
>>>>>>> 49762404994bfa5a6c0729878ee8a2e4a67b2e95
};