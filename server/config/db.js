const { Sequelize } = require('sequelize');
const colors = require('colors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from root directory (ignored in production deploy unless present)
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Allow several possible env var names so misconfiguration is easier to detect
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DB_URL || process.env.POSTGRES_URL || process.env.PG_URL;

// Determine if we're running in a serverless platform (Vercel) to tune pooling & failure behavior
const isServerless = !!process.env.VERCEL || process.env.SERVERLESS === 'true';

// Lazy singleton so serverless cold starts only create one connection
let sequelize;
let initialized = false;

function buildSequelize() {
  if (sequelize) return sequelize;
  if (!DATABASE_URL) {
    console.error('Database URL not found in environment variables (DATABASE_URL / NEON_DB_URL / POSTGRES_URL / PG_URL)'.red.bold);
  }

  // Smaller pool for serverless to avoid connection exhaustion; larger for long-lived server
  const poolConfig = isServerless ? { max: 1, min: 0, idle: 5000, acquire: 20000 } : { max: 10, min: 0, acquire: 60000, idle: 10000, evict: 1000 };

  sequelize = new Sequelize(DATABASE_URL || 'postgres://invalid:invalid@localhost:5432/invalid', {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
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
  const instance = buildSequelize();
  if (initialized) return instance;
  try {
    if (!DATABASE_URL) {
      throw new Error('Missing database connection string (set DATABASE_URL in environment)');
    }
    console.log('Database configuration:'.yellow);
    console.log(`Using NeonDB serverless PostgreSQL${isServerless ? ' (serverless mode)' : ''}`.cyan);
    const redacted = DATABASE_URL.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1********$3');
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
