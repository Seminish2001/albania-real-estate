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
import { validateEnv } from './config/env.js';

// Load env vars first
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

  // Security Middleware
  app.use(securityHeaders);
  app.use(sqlInjectionProtection);
  app.use(xssProtection);
  app.use(compression());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));

  // Rate limiting
  app.use('/api/auth/', authLimiter);
  app.use('/api/', apiLimiter);
  app.use('/api/chat/', strictLimiter);

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

  // Health check (no rate limiting)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0'
    });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/agents', agentRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', paymentRoutes);

  // Socket.io for real-time chat
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

  // 404 handler
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found'
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }

    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  });

  return { app, server: httpServer, io };
};

const startServer = async () => {
  validateEnv();
  const { server } = await createServer();
  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log('🔒 Security features: Enabled');
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { io, app };
