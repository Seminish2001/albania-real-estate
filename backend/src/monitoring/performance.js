import { redisCache } from '../config/redis.js';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.slowQueryThreshold = 1000; // 1 second
  }

  startRequest(req) {
    req._startTime = process.hrtime();
    req._requestId = Math.random().toString(36).substr(2, 9);
  }

  endRequest(req, res) {
    if (!req._startTime) return;

    const [seconds, nanoseconds] = process.hrtime(req._startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;

    this.recordMetric('request_duration', duration);
    const routeKey = `route_${req.method}_${req.route?.path || req.path}`;
    this.recordMetric(routeKey, duration);

    // Log slow requests
    if (duration > this.slowQueryThreshold) {
      console.warn('Slow request detected:', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration.toFixed(2)}ms`,
        user: req.user?.id,
        ip: req.ip
      });
    }

    // Add performance header
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
  }

  recordQuery(operation, duration, success = true) {
    this.recordMetric(`db_${operation}`, duration);
    this.recordMetric(`db_${operation}_${success ? 'success' : 'error'}`, 1);
  }

  recordMetric(name, value) {
    const bucket = new Date().toISOString().slice(0, 13); // Hourly buckets
    const key = `metric_${name}_${bucket}`;

    redisCache
      .increment(key, value)
      .then((result) => {
        if (result === null) return;
        redisCache.expire(key, 60 * 60 * 24).catch(console.error);
      })
      .catch(console.error);
  }

  async getMetrics(timeframe = '1h') {
    const metrics = {};

    // Get metrics from Redis
    const patterns = {
      request_duration: 'avg_request_time',
      db_query: 'avg_db_time',
      error_rate: 'error_percentage'
    };

    for (const [pattern, label] of Object.entries(patterns)) {
      const keys = await this.getMetricKeys(pattern, timeframe);
      const values = await Promise.all(keys.map((key) => redisCache.get(key)));

      metrics[label] = this.calculateAverage(values.filter((v) => v !== null));
    }

    return metrics;
  }

  async getMetricKeys(pattern, timeframe) {
    const hours = timeframe === '24h' ? 24 : 1;
    const keys = [];

    for (let i = 0; i < hours; i++) {
      const date = new Date();
      date.setHours(date.getHours() - i);
      keys.push(`metric_${pattern}_${date.toISOString().slice(0, 13)}`);
    }

    return keys;
  }

  calculateAverage(values) {
    if (values.length === 0) return 0;
    const numericValues = values.map((value) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    });

    if (numericValues.length === 0) return 0;

    const sum = numericValues.reduce((a, b) => a + b, 0);
    return sum / numericValues.length;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Performance middleware
export const performanceMiddleware = (req, res, next) => {
  performanceMonitor.startRequest(req);

  res.on('finish', () => {
    performanceMonitor.endRequest(req, res);
  });

  next();
};

// Database query monitoring
export const monitorQuery = (operation) => {
  return (target, propertyName, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const start = process.hrtime();
      try {
        const result = await originalMethod.apply(this, args);
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        performanceMonitor.recordQuery(operation, duration, true);
        return result;
      } catch (error) {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        performanceMonitor.recordQuery(operation, duration, false);
        throw error;
      }
    };

    return descriptor;
  };
};
