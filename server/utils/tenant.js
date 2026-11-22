const { Tenant } = require('../models');

// Clerk Organizations don't get reassigned to a different Tenant at runtime, so a
// resolved mapping is safe to cache for the life of the process.
const orgTenantCache = new Map();

/**
 * Resolve the tenantId for an authenticated request. A Clerk Organization is
 * authoritative when present -- it rides the session JWT directly (org_id claim), no
 * extra DB trust needed beyond the org_id -> Tenant lookup. Otherwise (legacy JWT
 * login, or a Clerk session with no active Organization) falls back to the tenantId
 * already stored on the resolved local user row.
 */
async function resolveTenantId({ clerkOrgId, localUser } = {}) {
  if (clerkOrgId) {
    if (orgTenantCache.has(clerkOrgId)) {
      const cached = orgTenantCache.get(clerkOrgId);
      if (cached) return cached;
      // Fall through to local user on a cached miss too -- org may get provisioned later.
    } else {
      const tenant = await Tenant.findOne({ where: { clerkOrgId } });
      const tenantId = tenant ? tenant.id : null;
      orgTenantCache.set(clerkOrgId, tenantId);
      if (tenantId) return tenantId;
    }
  }
  return localUser?.tenantId || null;
}

module.exports = { resolveTenantId };
