const { createClerkClient, verifyToken } = require('@clerk/backend');

// Initialize clerk client with secret key from environment
if (!process.env.CLERK_SECRET_KEY) {
  console.warn('CLERK_SECRET_KEY not found in environment. Clerk authentication will not work.');
}

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Verify a Clerk session token from Authorization bearer header.
 * Returns { user, orgId } on success (orgId is the Clerk Organization ID active in this
 * session, null if the user isn't in an Organization context), null otherwise.
 */
async function verifyClerkToken(token) {
  if (!token || !process.env.CLERK_SECRET_KEY) return null;

  try {
    // Remove potential 'Bearer ' prefix if passed by mistake
    const raw = token.replace(/^Bearer\s+/i, '');

    // Verify Clerk JWT using backend SDK (RS256)
    const payload = await verifyToken(raw, {
      secretKey: process.env.CLERK_SECRET_KEY
    });

    if (!payload || !payload.sub) return null;

    // Get the full user object
    const user = await clerkClient.users.getUser(payload.sub);
    if (!user) return null;
    return { user, orgId: payload.org_id || null };
  } catch (err) {
    console.log('Clerk token verification failed:', err.message);
    return null;
  }
}

/**
 * Map a Clerk user to local DB record by email and infer role.
 * Priority: Admin -> Teacher -> Student.
 */
async function mapClerkUserToLocal(user, models, options = {}) {
  const { Student, Teacher, Admin } = models;
  const desiredRole = (options.desiredRole || '').toLowerCase();
  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress || user?.primaryEmailAddress?.emailAddress;
  const clerkId = user?.id;

  // Prefer explicit linkage via clerkId when available
  const findBy = async (Model, where) => Model.findOne({ where, attributes: { exclude: ['password'] } }).catch(() => null);

  // Finds by clerkId first (authoritative); falling back to email (e.g. an Excel-imported
  // student logging in for the first time, with no clerkId on file yet). When a match is
  // found only via email, backfill clerkId onto that row so every subsequent login resolves
  // directly instead of depending on the email matching exactly again.
  const findAndLinkClerkId = async (Model, primaryEmailValue) => {
    const byClerkId = await findBy(Model, { clerkId });
    if (byClerkId) return byClerkId;
    if (!primaryEmailValue) return null;
    const byEmail = await findBy(Model, { email: primaryEmailValue });
    if (byEmail && byEmail.clerkId !== clerkId) {
      try {
        await byEmail.update({ clerkId });
      } catch (e) {
        console.warn('[Clerk] Failed to backfill clerkId:', e.message);
      }
    }
    return byEmail;
  };

  const roleQueries = {
    admin: async () => findAndLinkClerkId(Admin, primaryEmail),
    teacher: async () => findAndLinkClerkId(Teacher, primaryEmail),
    student: async () => findAndLinkClerkId(Student, primaryEmail),
  };

    // Enforce role-specific portals when a desired role was provided
  if (desiredRole === 'admin' || desiredRole === 'teacher' || desiredRole === 'student') {
    const match = await roleQueries[desiredRole]();
    if (match) return { user: match, role: match.role || desiredRole };
    
    // AUTO PROVISIONING 
    if (primaryEmail && (desiredRole === 'teacher' || desiredRole === 'student')) {
      let claimedInvite = null;
      // 1. Check for a pending invite in the new RBAC system
      try {
        const { PendingInvite } = require('../models');
        if (PendingInvite) {
          const invite = await PendingInvite.findOne({ 
            where: { email: primaryEmail, status: 'pending' } 
          });
          
          if (invite) {
            // Update invite status to claimed
            await invite.update({ status: 'claimed' });
            // The creation logic below will execute using the invite intended role if desiredRole matches,
            // or we could enforce invite.intendedRole === desiredRole.
            // For now, let it fall through to create the record, knowing an invite existed.
            console.log(`[Auto-Provision] Claimed pending invite for ${primaryEmail}`);
            claimedInvite = invite;
          }
        }
      } catch (e) {
        console.warn('[Auto-Provision] PendingInvite check failed (model might not be synced yet):', e.message);
      }

      // Never create an academic account merely because somebody signed up in Clerk.
      // The local roster/import must explicitly invite the address first.
      if (!claimedInvite) return null;

      const { unguessableLocalSecret } = require('../services/accountProvisioningService');
      const dummyPassword = unguessableLocalSecret();
      const fullName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : primaryEmail.split('@')[0];
      
      try {
        if (desiredRole === 'teacher') {
          const newTeacher = await Teacher.create({
            id: `T${Math.floor(Math.random() * 900000) + 100000}`,
            name: fullName,
            email: primaryEmail,
            clerkId: clerkId,
            password: dummyPassword,
            role: 'teacher'
          });
          return { user: newTeacher, role: 'teacher' };
        } else if (desiredRole === 'student') {
          const newStudent = await Student.create({
            id: `S${Math.floor(Math.random() * 900000) + 100000}`,
            name: fullName,
            email: primaryEmail,
            clerkId: clerkId,
            password: dummyPassword,
            role: 'student',
            section: claimedInvite.intendedScopeId ? JSON.parse(claimedInvite.intendedScopeId).section || 'Pending' : 'Pending',
            batch: claimedInvite.intendedScopeId ? JSON.parse(claimedInvite.intendedScopeId).batchId : null,
            tenantId: claimedInvite.tenantId,
          });
          return { user: newStudent, role: 'student' };
        }
      } catch (err) {
        console.error('Auto-provisioning failed (possibly a race condition):', err.message);
        // If creation failed due to a race condition (e.g., React Strict Mode double fetch),
        // try finding the user one more time.
        try {
          if (desiredRole === 'teacher') {
            const existing = await Teacher.findOne({ where: { email: primaryEmail } });
            if (existing) return { user: existing, role: 'teacher' };
          } else if (desiredRole === 'student') {
            const existing = await Student.findOne({ where: { email: primaryEmail } });
            if (existing) return { user: existing, role: 'student' };
          }
        } catch (retryErr) {
          console.error('Retry find failed:', retryErr);
        }
      }
    }
    
    return null;
  }

  // Fallback: priority Admin -> Teacher -> Student
  const adminUser = await roleQueries.admin();
  if (adminUser) return { user: adminUser, role: adminUser.role || 'admin' };
  const teacherUser = await roleQueries.teacher();
  if (teacherUser) return { user: teacherUser, role: teacherUser.role || 'teacher' };
  const studentUser = await roleQueries.student();
  if (studentUser) return { user: studentUser, role: studentUser.role || 'student' };

  return null;
}

module.exports = { verifyClerkToken, mapClerkUserToLocal, clerkClient };
