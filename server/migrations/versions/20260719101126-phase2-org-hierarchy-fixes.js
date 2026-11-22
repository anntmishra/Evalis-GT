// Phase 2: Org hierarchy fixes + imports groundwork.
//
// - Program.departmentId: activates the School -> Department -> Program -> Batch chain
//   (previously commented out in models/index.js as broken; Program.schoolId is kept as a
//   denormalized shortcut for existing UI, see programModel.js).
// - Batch.departmentId: real FK alongside the legacy free-text `department` STRING column
//   (kept for display/back-compat), authoritative for role-scoping joins going forward.
// - StudentSectionEnrollments: new table recording which section a student belongs to per
//   semester -- required for HOD-by-section routing and lecture-group resolution.
//
// Each statement is independent and idempotent (IF NOT EXISTS / IF EXISTS guards), not
// wrapped in one multi-statement transaction: this DB exhibited inconsistent behavior with
// queryInterface.transaction() during development (some statements landing outside the
// wrapping transaction), so statements are run standalone and can be safely re-run.

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "academics"."Programs" ADD COLUMN IF NOT EXISTS "departmentId" UUID REFERENCES "academics"."Departments" ("id")`
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE "academics"."Batches" ADD COLUMN IF NOT EXISTS "departmentId" UUID REFERENCES "academics"."Departments" ("id")`
    );

    await queryInterface.sequelize.query(
      `CREATE TABLE IF NOT EXISTS "academics"."StudentSectionEnrollments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "studentId" VARCHAR(255) NOT NULL REFERENCES "users"."Students" ("id"),
        "sectionId" UUID NOT NULL REFERENCES "academics"."Sections" ("id"),
        "semesterId" VARCHAR(255) NOT NULL REFERENCES "academics"."Semesters" ("id"),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "enteredAt" TIMESTAMP WITH TIME ZONE,
        "exitedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      )`
    );

    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "student_section_enrollment_one_active_per_semester"
       ON "academics"."StudentSectionEnrollments" ("studentId", "semesterId")
       WHERE "isActive" = true`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "academics"."StudentSectionEnrollments"`);
    await queryInterface.sequelize.query(`ALTER TABLE "academics"."Batches" DROP COLUMN IF EXISTS "departmentId"`);
    await queryInterface.sequelize.query(`ALTER TABLE "academics"."Programs" DROP COLUMN IF EXISTS "departmentId"`);
  },
};
