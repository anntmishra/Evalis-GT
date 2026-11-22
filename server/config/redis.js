const Redis = require('ioredis');

// Connect to Redis with silent fallback for local dev without Docker
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  // BullMQ requires maxRetriesPerRequest to be null for blocking ops
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 3) {
      console.warn('[Redis] Could not connect to Redis. Running in fallback mode without caching.');
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000);
  }
});

redis.on('error', (error) => {
  if (error.code === 'ECONNREFUSED') {
    // Suppress verbose connection errors for fallback mode
  } else {
    console.error('[Redis Error]', error);
  }
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

// Wrapper to safely use Redis methods (it will just return null/do nothing if disconnected)
const safeRedis = {
  async get(key) {
    if (redis.status !== 'ready') return null;
    try {
      return await redis.get(key);
    } catch (e) {
      return null;
    }
  },
  async set(key, value, mode, duration) {
    if (redis.status !== 'ready') return;
    try {
      if (mode && duration) {
        await redis.set(key, value, mode, duration);
      } else {
        await redis.set(key, value);
      }
    } catch (e) {
      console.error('[Redis Set Error]', e);
    }
  },
  async del(key) {
    if (redis.status !== 'ready') return;
    try {
      await redis.del(key);
    } catch (e) {
      console.error('[Redis Del Error]', e);
    }
  },
  client: redis
};

module.exports = safeRedis;
