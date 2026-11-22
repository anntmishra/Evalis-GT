# Evalis

Evalis is an academic workspace for students, faculty, programme coordinators, department and school leaders, examination staff, and administrators. The frontend is React/Vite; the API is Express; application data is in PostgreSQL on Neon.

## Run locally

Install dependencies in the repository root and `server/`, then set the required environment variables in the ignored root `.env`. Use a pooled PostgreSQL URL for application traffic and an unpooled URL for migrations. The server requires `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `JWT_SECRET`. Local frontend development uses `.env.development.local` with `VITE_AUTH_MODE=local` and `VITE_API_BASE_URL=/api`.

```sh
npm install
npm --prefix server install
npm run dev
```

The frontend is at `http://localhost:5173`; the API is at `http://localhost:3000`. The public sign-in shows **Student** and **Teacher**. Academic leaders enter through Teacher and are routed by their verified server role. Administrative entry is private. Development credentials are stored in the ignored, local-only `.local-db/development-logins.json`. Never commit or publish that file.

The development login uses existing password/JWT endpoints. Production still uses Clerk. The [auth replacement plan](docs/auth-replacement-plan.md) defines the migration to persistent, revocable first-party sessions.

## Database

The new Neon database has the application schema, 14 records recovered from the local `server/exports` snapshot, and a separate development institution with eight test accounts. The previous remote databases were inaccessible, so the recovered snapshot is the only imported historical source. Existing Neon-managed `neon_auth` tables were left untouched.

`npm run db:verify` performs a read-only check of the schema, recovered fields, role accounts, passwords, academic links, and migration baseline. `npm run db:prepare` first checks that the target application schema is empty. `npm run db:prepare -- --apply` initializes an empty development database transactionally; it refuses an occupied schema. Do not run it against a shared or production database.

Submissions and graded files currently use server filesystem storage; PostgreSQL stores their metadata and URLs. A 1 GB database is ample for the present records, but reliable deployment of uploaded files still needs object storage and a retention policy. Do not put PDF binaries in PostgreSQL.

## Verify

```sh
npm run check:baseline
npm run db:verify
curl http://localhost:3000/api/health
```

The baseline runs lint, server syntax, isolated tests, TypeScript checks, and a production frontend build. The health endpoint reports the database status under `checks.database.status`. The application schema is not changed at server startup; migrations are explicit.

## Current boundaries

Dashboard overviews and key student, faculty, coordinator, leadership, and examination read routes use verified tenant and academic scope. Assessment approval and result publication are separate role-gated actions. Student submission scores stay hidden until publication. Full account replacement, complete browser acceptance coverage, course-grade policy, and durable cloud file storage remain separate work. The current development JWT stored in browser storage is only for local testing, not the planned production session design.
