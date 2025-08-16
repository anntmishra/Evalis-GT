const { Sequelize } = require('sequelize');
const colors = require('colors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from root directory (ignored in production deploy unless present)
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Helper to fetch DB URL each time (avoids capturing an undefined early value)
function resolveDatabaseUrl() {
  const raw = process.env.DATABASE_URL || process.env.NEON_DB_URL || process.env.POSTGRES_URL || process.env.PG_URL;
  // Some hosting dashboards accidentally inject the literal string "null" or empty string
  if (!raw || raw === 'null' || raw === 'undefined') return undefined;
  return raw.trim();
}

// Determine if we're running in a serverless platform (Vercel) to tune pooling & failure behavior
const isServerless = !!process.env.VERCEL || process.env.SERVERLESS === 'true';

// Lazy singleton so serverless cold starts only create one connection
let sequelize;
let initialized = false;

function buildSequelize() {
  if (sequelize) return sequelize;
  const dbUrl = resolveDatabaseUrl();

  if (!dbUrl) {
    console.error('❌ Database URL not found in environment variables (DATABASE_URL / NEON_DB_URL / POSTGRES_URL / PG_URL)'.red.bold);
    console.error('   Current keys present:', Object.keys(process.env).filter(k => /(DATABASE_URL|NEON|POSTGRES|PG_?URL)/i.test(k)).join(', ') || 'none');
    // Do NOT attempt to instantiate Sequelize with an invalid placeholder; this caused internal .replace() on null
    throw new Error('Missing database connection string');
  }

  if (typeof dbUrl !== 'string') {
    throw new Error(`Database URL is not a string (type=${typeof dbUrl})`);
  }

  // Smaller pool for serverless to avoid connection exhaustion; larger for long-lived server
  const poolConfig = isServerless ? { max: 1, min: 0, idle: 5000, acquire: 20000 } : { max: 10, min: 0, acquire: 60000, idle: 10000, evict: 1000 };

  console.log(`[DB] Initializing Sequelize (serverless=${isServerless})`.gray);
  const enableSqlLogs = (process.env.DB_LOG_SQL === 'true');
  sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: enableSqlLogs ? (msg) => console.log('[SQL]', msg) : (process.env.NODE_ENV === 'development' ? console.log : false),
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: poolConfig
  });
  return sequelize;
}

const connectDB = async () => {
  let instance;
  try {
    instance = buildSequelize();
  } catch (e) {
    // Provide clearer diagnostics in serverless logs
    console.error('Failed to build Sequelize instance before authenticate():', e.message);
    throw e; // serverless will surface this
  }
  if (initialized) return instance;
  try {
    const activeUrl = resolveDatabaseUrl();
    if (!activeUrl) {
      throw new Error('Missing database connection string (set DATABASE_URL / NEON_DB_URL in environment)');
    }
    console.log('Database configuration:'.yellow);
    console.log(`Using NeonDB serverless PostgreSQL${isServerless ? ' (serverless mode)' : ''}`.cyan);
    const redacted = activeUrl.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1********$3');
    console.log(`Connecting with URL (redacted): ${redacted}`.gray);
    await instance.authenticate();
    console.log('NeonDB PostgreSQL Connected'.cyan.underline);
    initialized = true;
    return instance;
  } catch (error) {
    console.error(`Error connecting to NeonDB PostgreSQL: ${error.message}`.red.bold);
    console.error('Troubleshooting checklist:');
    console.error('1. Ensure the DATABASE_URL (or NEON_DB_URL) is set in Vercel project settings');
    console.error('2. Confirm the connection string ends with ?sslmode=require or set ssl options');
    console.error('3. Make sure Neon database is provisioned and not paused');
    console.error('4. If using serverless, reduce pool size (handled automatically)');
    if (isServerless) {
      // In serverless do NOT exit; throw so the platform can return a 500 and we can retry on next invocation
      throw error;
    } else {
      process.exit(1);
    }
  }
};

module.exports = { connectDB, sequelize: buildSequelize() };
