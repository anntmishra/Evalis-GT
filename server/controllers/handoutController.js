const asyncHandler = require('express-async-handler');
const { CourseHandout, HandoutVote, Subject, Teacher } = require('../models');

// @desc    Propose a new Course Handout
// @route   POST /api/handouts
// @access  Private (HOD)
const proposeHandout = asyncHandler(async (req, res) => {
  const { subjectId, content, credits } = req.body;
  const proposerId = req.user.id;

  // Verify the user is an HOD (middleware handles basic role checking, but we can verify it here too)
  
  // Verify subject exists
  const subject = await Subject.findByPk(subjectId);
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }

  // Create the handout proposal
  const handout = await CourseHandout.create({
    subjectId,
    proposerId,
    content,
    credits,
    status: 'Pending Vote'
  });

  res.status(201).json(handout);
});

// @desc    Get pending handouts for voting
// @route   GET /api/handouts/pending
// @access  Private (HOD)
const getPendingHandouts = asyncHandler(async (req, res) => {
  const handouts = await CourseHandout.findAll({
    where: { status: 'Pending Vote' },
    include: [
      { model: Subject, attributes: ['id', 'name', 'credits'] },
      { model: Teacher, as: 'Proposer', attributes: ['id', 'name', 'email'] },
      { model: HandoutVote, attributes: ['voterId', 'vote', 'comments'] }
    ]
  });
  res.json(handouts);
});

// @desc    Vote on a course handout
// @route   POST /api/handouts/:id/vote
// @access  Private (HOD)
const voteHandout = asyncHandler(async (req, res) => {
  const { vote, comments } = req.body; // 'Approve' or 'Reject'
  const handoutId = req.params.id;
  const voterId = req.user.id;

  const handout = await CourseHandout.findByPk(handoutId);
  if (!handout) {
    res.status(404);
    throw new Error('Handout not found');
  }

  if (handout.proposerId === voterId) {
    res.status(400);
    throw new Error('You cannot vote on your own proposal');
  }

  if (handout.status !== 'Pending Vote') {
    res.status(400);
    throw new Error('This handout is no longer accepting votes');
  }

  // Check if already voted
  const existingVote = await HandoutVote.findOne({ where: { handoutId, voterId } });
  if (existingVote) {
    res.status(400);
    throw new Error('You have already voted on this handout');
  }

  // Record the vote
  await HandoutVote.create({
    handoutId,
    voterId,
    vote,
    comments
  });

  // Calculate total votes to see if it meets threshold (e.g. 3 approvals)
  const allVotes = await HandoutVote.findAll({ where: { handoutId } });
  const approvals = allVotes.filter(v => v.vote === 'Approve').length;
  const rejections = allVotes.filter(v => v.vote === 'Reject').length;

  // Define logic for approval (e.g., 3 approvals required, or simply > 50% if we know total HODs)
  // For this prototype, we'll use a fixed threshold of 2 approvals to officially "Approve"
  const APPROVAL_THRESHOLD = 2;
  const REJECTION_THRESHOLD = 2;

  let message = 'Vote recorded successfully';

  if (approvals >= APPROVAL_THRESHOLD) {
    handout.status = 'Approved';
    await handout.save();
    
    // Update the actual Subject credits and content
    const subject = await Subject.findByPk(handout.subjectId);
    if (subject) {
      subject.credits = handout.credits;
      // Ideally we also save the 'content' somewhere, maybe subject.description
      subject.description = handout.content;
      await subject.save();
    }
    message = 'Vote recorded. Handout has been Approved!';
  } else if (rejections >= REJECTION_THRESHOLD) {
    handout.status = 'Rejected';
    await handout.save();
    message = 'Vote recorded. Handout has been Rejected.';
  }

  res.json({ message, handout });
});

module.exports = {
  proposeHandout,
  getPendingHandouts,
  voteHandout
};
