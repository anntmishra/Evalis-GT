const crypto = require('crypto');
const { PendingInvite } = require('../models');
const { clerkClient } = require('../utils/clerk');
const { resolvePublicAppUrl } = require('../utils/publicAppUrl');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validateEmail(value) {
  return EMAIL_PATTERN.test(normalizeEmail(value));
}

// Local password authentication remains available for development and legacy accounts,
// but imported users never receive or choose this value. It is random, then hashed by
// the model hook. Production users claim the Clerk invitation and choose their own secret.
function unguessableLocalSecret() {
  return crypto.randomBytes(48).toString('base64url');
}

async function recordPendingInvite({ email, role, tenantId, scope = null, transaction }) {
  const normalized = normalizeEmail(email);
  const [invite] = await PendingInvite.findOrCreate({
    where: { email: normalized },
    defaults: {
      email: normalized,
      intendedRole: role,
      intendedScopeId: scope ? JSON.stringify(scope) : null,
      tenantId,
      status: 'pending',
    },
    transaction,
  });
  if (invite.status !== 'pending' || invite.intendedRole !== role || invite.tenantId !== tenantId) {
    await invite.update({
      intendedRole: role,
      intendedScopeId: scope ? JSON.stringify(scope) : null,
      tenantId,
      status: 'pending',
    }, { transaction });
  }
  return invite;
}

async function sendAccountInvitation({ email, role, name }) {
  if (!process.env.CLERK_SECRET_KEY) {
    return { sent: false, reason: 'CLERK_SECRET_KEY is not configured' };
  }
  try {
    const base = resolvePublicAppUrl();
    const redirectUrl = role === 'student' ? `${base}/student/sign-up` : `${base}/teacher/sign-up`;
    await clerkClient.invitations.createInvitation({
      emailAddress: normalizeEmail(email),
      redirectUrl,
      ignoreExisting: true,
      notify: true,
      publicMetadata: { evalisRole: role, displayName: name || undefined },
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error?.errors?.[0]?.longMessage || error.message || 'Invitation failed' };
  }
}

module.exports = {
  normalizeEmail,
  validateEmail,
  unguessableLocalSecret,
  recordPendingInvite,
  sendAccountInvitation,
};
