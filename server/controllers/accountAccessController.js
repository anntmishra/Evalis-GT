const asyncHandler = require('express-async-handler');
const { Student, Teacher } = require('../models');
const {
  normalizeEmail,
  validateEmail,
  recordPendingInvite,
  sendAccountInvitation,
} = require('../services/accountProvisioningService');
const { sendAccountAccessEmail } = require('../utils/emailUtils');

const sendAccountAccess = asyncHandler(async (req, res) => {
  const role = req.body.role === 'student' ? 'student' : req.body.role === 'teacher' ? 'teacher' : null;
  const email = normalizeEmail(req.body.email);
  if (!role || !validateEmail(email)) {
    res.status(400);
    throw new Error('Provide a valid email and select student or teacher');
  }

  const Model = role === 'student' ? Student : Teacher;
  const account = await Model.findOne({ where: { email, tenantId: req.tenantId } });
  if (!account) {
    res.status(404);
    throw new Error(`No ${role} account exists for this email`);
  }

  if (!account.clerkId) {
    await recordPendingInvite({
      email,
      role,
      tenantId: req.tenantId,
      scope: role === 'student' ? { batchId: account.batch, section: account.section } : null,
    });
    const invitation = await sendAccountInvitation({ email, role, name: account.name });
    if (!invitation.sent) {
      res.status(503);
      throw new Error(`The invitation could not be sent: ${invitation.reason}`);
    }
    return res.json({ sent: true, kind: 'account_setup', message: 'A secure Clerk account-setup invitation was sent.' });
  }

  await sendAccountAccessEmail({ email, name: account.name, role });
  res.json({ sent: true, kind: 'password_help', message: 'An access email was sent. The user can choose Forgot password on the Clerk sign-in screen.' });
});

module.exports = { sendAccountAccess };
