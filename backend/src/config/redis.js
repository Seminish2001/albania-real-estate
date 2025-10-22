import Redis from 'ioredis';

class RedisCache {
  constructor() {
    this.enabled = Boolean(process.env.REDIS_URL) || process.env.NODE_ENV !== 'test';

    if (!this.enabled) {
      this.redis = null;
      console.log('ℹ️ Redis caching disabled for current environment');
      return;
    }

    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('error', (error) => {
      console.error('Redis error:', error);
    });

    this.redis.on('connect', () => {
      console.log('✅ Connected to Redis');
    });
  }

  isEnabled() {
    return Boolean(this.enabled && this.redis);
  }

  async set(key, value, expiration = 3600) {
    if (!this.isEnabled()) return false;

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, expiration, serialized);
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    if (!this.isEnabled()) return null;

    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async del(key) {
    if (!this.isEnabled()) return false;

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async flushPattern(pattern) {
    if (!this.isEnabled()) return false;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Redis flush pattern error:', error);
      return false;
    }
  }

  async increment(key, value = 1) {
    if (!this.isEnabled()) return null;

    try {
      if (Number.isInteger(value)) {
        return await this.redis.incrby(key, value);
      }

      return await this.redis.incrbyfloat(key, value);
    } catch (error) {
      console.error('Redis increment error:', error);
      return null;
    }
  }

  async expire(key, seconds) {
    if (!this.isEnabled()) return false;

    try {
      await this.redis.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis expire error:', error);
      return false;
    }
  }
}

export const redisCache = new RedisCache();
