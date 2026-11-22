// Phase 1: Role & tenant foundation.
//
// - Adds Tenant.clerkOrgId so a request's Clerk Organization maps directly to a Tenant.
// - Seeds one default Tenant (the institution operating today, pre-multi-tenancy) and
//   backfills every tenant-scoped row to it, so existing data keeps working unmodified.
// - Adds tenantId (NOT NULL after backfill) to every Tier-1 identity/hot table.
// - Reworks UserRoleAssignment: userType -> role, plus teacherId/subjectId/semesterId
//   (needed for subject+batch+section-scoped HOD assignments), status/source/rebalanceId
//   (needed for reviewable HOD auto-split proposals in a later phase), and a grant audit trail.
//
// Tier-1 tables (tenantId lives directly on the row): School, Student, Teacher, Admin,
// Submission, Quiz, StudentSubjectGrade, UserRoleAssignment, Notification, PendingInvite,
// RoleRequest. Everything else inherits tenant scope transitively via FK join (see plan).

const TENANT_TABLES = [
  { tableName: 'Schools', schema: 'academics' },
  { tableName: 'Students', schema: 'users' },
  { tableName: 'Teachers', schema: 'users' },
  { tableName: 'Admins', schema: 'users' },
  { tableName: 'Submissions', schema: 'results' },
  { tableName: 'Quizzes', schema: 'examinations' },
  { tableName: 'StudentSubjectGrades', schema: 'results' },
  { tableName: 'UserRoleAssignments', schema: 'users' },
  { tableName: 'Notifications', schema: 'notifications' },
  { tableName: 'PendingInvites', schema: 'notifications' },
  { tableName: 'RoleRequests', schema: 'administration' },
];

const TENANT_TABLE_REF = { tableName: 'Tenants', schema: 'administration' };
const USER_ROLE_ASSIGNMENT_REF = { tableName: 'UserRoleAssignments', schema: 'users' };

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_TENANT_NAME = 'Default Institution';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Tenant <-> Clerk Organization mapping
      await queryInterface.addColumn(
        TENANT_TABLE_REF,
        'clerkOrgId',
        { type: Sequelize.STRING, allowNull: true, unique: true },
        { transaction }
      );

      // 2. Seed the default tenant representing today's single institution.
      await queryInterface.sequelize.query(
        `INSERT INTO "administration"."Tenants" (id, name, "isActive", "createdAt", "updatedAt")
         VALUES (:id, :name, true, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        { replacements: { id: DEFAULT_TENANT_ID, name: DEFAULT_TENANT_NAME }, transaction }
      );

      // 3. Add tenantId (nullable first), backfill, then enforce NOT NULL.
      for (const table of TENANT_TABLES) {
        await queryInterface.addColumn(
          table,
          'tenantId',
          { type: Sequelize.UUID, allowNull: true, references: { model: TENANT_TABLE_REF, key: 'id' } },
          { transaction }
        );

        await queryInterface.sequelize.query(
          `UPDATE "${table.schema}"."${table.tableName}" SET "tenantId" = :tenantId WHERE "tenantId" IS NULL`,
          { replacements: { tenantId: DEFAULT_TENANT_ID }, transaction }
        );

        await queryInterface.changeColumn(
          table,
          'tenantId',
          { type: Sequelize.UUID, allowNull: false },
          { transaction }
        );
      }

      // 4. UserRoleAssignment rework.
      // Raw SQL, not queryInterface.renameColumn(): this DB has a stale orphaned
      // "public"."UserRoleAssignments" table left over from before the schema-per-domain
      // migration (2 rows, untouched here). Sequelize's renameColumn() internally calls
      // describeTable(), whose generated SQL joins on unqualified relname against
      // pg_statio_all_tables/pg_description and throws "more than one row returned by a
      // subquery" once two same-named tables exist in different schemas. A direct,
      // schema-qualified ALTER TABLE sidesteps that introspection path entirely.
      await queryInterface.sequelize.query(
        'ALTER TABLE "users"."UserRoleAssignments" RENAME COLUMN "userType" TO "role"',
        { transaction }
      );

      await queryInterface.addColumn(
        USER_ROLE_ASSIGNMENT_REF,
        'teacherId',
        { type: Sequelize.STRING, allowNull: true, references: { model: { tableName: 'Teachers', schema: 'users' }, key: 'id' } },
        { transaction }
      );
      await queryInterface.addColumn(
        USER_ROLE_ASSIGNMENT_REF,
        'subjectId',
        { type: Sequelize.STRING, allowNull: true, references: { model: { tableName: 'Subjects', schema: 'subjects' }, key: 'id' } },
        { transaction }
      );
      await queryInterface.addColumn(
        USER_ROLE_ASSIGNMENT_REF,
        'semesterId',
        { type: Sequelize.STRING, allowNull: true, references: { model: { tableName: 'Semesters', schema: 'academics' }, key: 'id' } },
        { transaction }
      );
      await queryInterface.addColumn(
        USER_ROLE_ASSIGNMENT_REF,
        'status',
        { type: Sequelize.ENUM('active', 'revoked'), allowNull: false, defaultValue: 'active' },
        { transaction }
      );
      await queryInterface.addColumn(
        USER_ROLE_ASSIGNMENT_REF,
        'source',
        { type: Sequelize.ENUM('manual', 'auto_split'), allowNull: false, defaultValue: 'manual' },
        { transaction }
      );
      await queryInterface.addColumn(
        USER_ROLE_ASSIGNMENT_REF,
        'rebalanceId',
        { type: Sequelize.UUID, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        USER_ROLE_ASSIGNMENT_REF,
        'grantedBy',
        { type: Sequelize.STRING, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        USER_ROLE_ASSIGNMENT_REF,
        'grantedAt',
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        USER_ROLE_ASSIGNMENT_REF,
        'revokedBy',
        { type: Sequelize.STRING, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        USER_ROLE_ASSIGNMENT_REF,
        'revokedAt',
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const col of ['revokedAt', 'revokedBy', 'grantedAt', 'grantedBy', 'rebalanceId', 'source', 'status', 'semesterId', 'subjectId', 'teacherId']) {
        await queryInterface.removeColumn(USER_ROLE_ASSIGNMENT_REF, col, { transaction });
      }
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "users"."enum_UserRoleAssignments_status"', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "users"."enum_UserRoleAssignments_source"', { transaction });

      // Raw SQL for the same reason as in up() -- avoid Sequelize's describeTable().
      await queryInterface.sequelize.query(
        'ALTER TABLE "users"."UserRoleAssignments" RENAME COLUMN "role" TO "userType"',
        { transaction }
      );

      for (const table of TENANT_TABLES) {
        await queryInterface.removeColumn(table, 'tenantId', { transaction });
      }

      await queryInterface.sequelize.query(
        `DELETE FROM "administration"."Tenants" WHERE id = :id`,
        { replacements: { id: DEFAULT_TENANT_ID }, transaction }
      );

      await queryInterface.removeColumn(TENANT_TABLE_REF, 'clerkOrgId', { transaction });
    });
  },
};
