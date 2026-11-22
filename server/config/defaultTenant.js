// The tenant seeded by the Phase 1 migration (20260719094235-phase1-role-tenant-foundation.js)
// representing the single institution operating before multi-tenancy existed. Tier-1 models
// default their tenantId to this so existing create() call sites (admin flows, seeders, CLI
// scripts, serverless-robust.js) keep working without having to pass one explicitly yet.
// Must match the ID inserted by that migration.
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

module.exports = { DEFAULT_TENANT_ID };
