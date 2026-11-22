// Phase 3 (cont'd): a student's own lecture-group membership -- direct and simple, for
// roster display/edit in the Program Coordinator portal. Distinct from
// Section.sectionGroupId (added in the prior migration), which scopes a subject-specific
// teaching Section's lectures rather than a student's personal group membership.

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "users"."Students" ADD COLUMN IF NOT EXISTS "sectionGroupId" UUID REFERENCES "academics"."SectionGroups" ("id")`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "users"."Students" DROP COLUMN IF EXISTS "sectionGroupId"`);
  },
};
