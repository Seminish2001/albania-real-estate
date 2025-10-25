import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Security imports
import {
  securityHeaders,
  authLimiter,
  apiLimiter,
  strictLimiter,
  sqlInjectionProtection,
  xssProtection
} from './middleware/security.js';

// Monitoring and logging imports
import { performanceMiddleware } from './monitoring/performance.js';
import { requestLogger, securityLogger } from './utils/logger.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Config imports
import { validateEnv } from './config/env.js';
import {
  createIndexes,
  analyzeTables,
  createPerformanceViews
} from './config/optimize.js';
import { createTables } from './config/migrate.js';

// Load environment variables
dotenv.config();
validateEnv();

// Import routes
import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import userRoutes from './routes/users.js';
import agentRoutes from './routes/agents.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';

let app;
let httpServer;
let io;

export const createServer = async () => {
  if (app && httpServer && io) {
    return { app, server: httpServer, io };
  }

  app = express();
  httpServer = createHttpServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // ===== MIDDLEWARE SETUP =====

  // Security (first)
  app.use(securityHeaders);
  app.use(sqlInjectionProtection);
  app.use(xssProtection);

  // Monitoring (early)
  app.use(performanceMiddleware);
  app.use(requestLogger);
  app.use(securityLogger);

  // Core middleware
  app.use(compression());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));

  // Rate limiting
  app.use('/api/auth/', authLimiter);
  app.use('/api/', apiLimiter);
  app.use('/api/chat/', strictLimiter);

  // Body parsers with payment webhook exception
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/payments/webhook')) {
      return next();
    }
    return express.json({ limit: '10mb' })(req, res, next);
  });

  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/payments/webhook')) {
      return next();
    }
    return express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  });

  // ===== ROUTES =====

  // Health check (no rate limiting, no auth)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/agents', agentRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', paymentRoutes);

  // ===== SOCKET.IO =====

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-user', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });

    socket.on('join-chat', (chatId) => {
      socket.join(chatId);
    });

    socket.on('leave-chat', (chatId) => {
      socket.leave(chatId);
    });

    socket.on('typing-start', (data) => {
      const { chatId, userId } = data;
      socket.to(chatId).emit('user-typing', {
        chatId,
        userId,
        typing: true
      });
    });

    socket.on('typing-stop', (data) => {
      const { chatId, userId } = data;
      socket.to(chatId).emit('user-typing', {
        chatId,
        userId,
        typing: false
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('User disconnected:', socket.id, 'Reason:', reason);
    });
  });

  // ===== ERROR HANDLING =====

  // 404 handler
  app.use('/api/*', notFoundHandler);

  // Global error handler (must be last)
  app.use(globalErrorHandler);

  return { app, server: httpServer, io };
};

const shouldRunOptimizations = () => {
  const flag = process.env.ENABLE_DB_OPTIMIZATIONS;
  return flag && flag.toLowerCase() === 'true';
};

const runDatabaseOptimizations = async () => {
  if (!shouldRunOptimizations()) {
    console.log(
      'Skipping database optimization tasks (set ENABLE_DB_OPTIMIZATIONS=true to enable them).'
    );
    return;
  }

  try {
    console.log('Scheduling database optimization tasks...');
    await createIndexes();
    await analyzeTables();
    await createPerformanceViews();
    console.log('Database optimization tasks completed successfully');
  } catch (error) {
    console.error('Database optimization task failed:', error);
  }
};

const ensureDatabaseSchema = async () => {
  try {
    console.log('Running database migrations to ensure schema is up to date...');
    await createTables();
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Failed to run database migrations:', error);
    throw error;
  }
};

const startServer = async () => {
  const { server } = await createServer();
  const PORT = process.env.PORT || 5000;

  await ensureDatabaseSchema();
  runDatabaseOptimizations();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log('🔒 Security features: Enabled');
    console.log('📈 Monitoring: Enabled');
    console.log('🐛 Logging: Enabled');
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Graceful shutdown
const shutdown = () => {
  if (!httpServer) {
    process.exit(0);
    return;
  }

  console.log('Shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { io, app };
