import { redisCache } from '../config/redis.js';

export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET' || !redisCache.isEnabled()) {
      return next();
    }

    const cacheKey = `cache:${req.originalUrl}`;

    try {
      const cached = await redisCache.get(cacheKey);

      if (cached) {
        console.log('Cache hit:', cacheKey);
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        if (res.statusCode === 200) {
          redisCache.set(cacheKey, data, duration).catch((error) => {
            console.error('Failed to cache response:', error);
          });
        }
        return originalJson(data);
      };

      return next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      return next();
    }
  };
};

export const invalidateCache = async (patterns) => {
  if (!redisCache.isEnabled()) return;

  try {
    for (const pattern of patterns) {
      await redisCache.flushPattern(pattern);
    }
    console.log('Cache invalidated for patterns:', patterns);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

export const CACHE_PATTERNS = {
  PROPERTIES: 'cache:/api/properties*',
  PROPERTY_DETAILS: 'cache:/api/properties/*',
  AGENTS: 'cache:/api/agents*',
  FEATURED: 'cache:/api/properties/featured*'
};
