// Phase 3: SectionGroup -- the "4 sections combine into a 120-student lecture group"
// concept. Not hardcoded to any ratio: grouping is opt-in per batch/semester via
// Section.sectionGroupId (nullable), so a program with a single section per subject
// (e.g. Law) simply never creates a group.
//
// Standalone, idempotent statements (IF NOT EXISTS / IF EXISTS), not wrapped in
// queryInterface.transaction() -- this DB has shown inconsistent behavior with that
// helper (see Phase 1/2 migration comments); plain statements are safe to re-run.

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `CREATE TABLE IF NOT EXISTS "academics"."SectionGroups" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "batchId" VARCHAR(255) NOT NULL REFERENCES "academics"."Batches" ("id"),
        "semesterId" VARCHAR(255) NOT NULL REFERENCES "academics"."Semesters" ("id"),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      )`
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE "academics"."Sections" ADD COLUMN IF NOT EXISTS "sectionGroupId" UUID REFERENCES "academics"."SectionGroups" ("id")`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "academics"."Sections" DROP COLUMN IF EXISTS "sectionGroupId"`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "academics"."SectionGroups"`);
  },
};
