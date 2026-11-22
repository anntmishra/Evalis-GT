const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');
const { createDatabaseStream } = require('./databaseTransport');

dotenv.config({ path: path.join(__dirname, '../../.env') });

function resolveDatabaseUrl() {
  const raw = process.env.DB_USE_UNPOOLED === 'true'
    ? process.env.DATABASE_URL_UNPOOLED
    : process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_URL;
  if (!raw || ['null', 'undefined'].includes(raw.trim())) {
    throw new Error('Missing database URL for the selected connection mode');
  }
  return raw.trim();
}

const url = new URL(resolveDatabaseUrl());
const useSsl = (process.env.POSTGRES_SSL || process.env.DB_SSL || 'true').toLowerCase() === 'true';
const dnsServers = (process.env.DB_DNS_SERVERS || '').split(',').map(value => value.trim()).filter(Boolean);
// Pass explicit connection properties so URL sslmode cannot replace verified TLS options.
const sequelize = new Sequelize(decodeURIComponent(url.pathname.slice(1)), decodeURIComponent(url.username), decodeURIComponent(url.password), {
  host: url.hostname,
  port: Number(url.port || 5432),
  dialect: 'postgres',
  logging: process.env.DB_LOG_SQL === 'true' ? console.log : false,
  dialectOptions: {
    ssl: useSsl ? { rejectUnauthorized: true, servername: url.hostname } : false,
    connectionTimeoutMillis: 15000,
    application_name: 'evalis',
    ...(dnsServers.length ? { stream: createDatabaseStream(dnsServers) } : {}),
  },
  // Idle connections must drain so Neon's compute can suspend between test sessions.
  pool: { max: process.env.VERCEL ? 2 : 5, min: 0, acquire: 20000, idle: 10000 },
  retry: { max: 0 },
});

async function connectDB() {
  await sequelize.authenticate();
  console.log('[DB] PostgreSQL connection verified');
  return sequelize;
}

module.exports = { connectDB, sequelize };
