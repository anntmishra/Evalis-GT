module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`DO $$ BEGIN
      CREATE TYPE "examinations"."enum_QuestionPapers_status" AS ENUM ('draft','pending_hod','pending_coe','approved','changes_requested','rejected');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await queryInterface.sequelize.query(`CREATE TABLE IF NOT EXISTS "examinations"."QuestionPapers" (
      "id" UUID PRIMARY KEY,
      "title" VARCHAR(255) NOT NULL,
      "examType" VARCHAR(255) NOT NULL,
      "durationMinutes" INTEGER NOT NULL,
      "totalMarks" INTEGER NOT NULL,
      "questions" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "courseOutcomes" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "status" "examinations"."enum_QuestionPapers_status" NOT NULL DEFAULT 'draft',
      "submittedAt" TIMESTAMPTZ,
      "reviewedAt" TIMESTAMPTZ,
      "reviewHistory" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "version" INTEGER NOT NULL DEFAULT 1,
      "tenantId" UUID NOT NULL REFERENCES "administration"."Tenants" ("id"),
      "teacherId" VARCHAR(255) NOT NULL REFERENCES "users"."Teachers" ("id"),
      "subjectId" VARCHAR(255) NOT NULL REFERENCES "subjects"."Subjects" ("id"),
      "batchId" VARCHAR(255) NOT NULL REFERENCES "academics"."Batches" ("id"),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "question_papers_queue" ON "examinations"."QuestionPapers" ("tenantId", "status", "subjectId")`);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "examinations"."QuestionPapers"`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "examinations"."enum_QuestionPapers_status"`);
  },
};
