import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import userRoutes from './routes/users.js';
import agentRoutes from './routes/agents.js';
import chatRoutes from './routes/chat.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import { validateEnv, initErrorTracking } from './config/env.js';
import { createIndexes } from './config/optimize.js';
import {
  securityHeaders,
  corsMiddleware,
  authLimiter,
  apiLimiter,
  corsOptions
} from './middleware/security.js';

dotenv.config();

export let io;

const configureApp = () => {
  const app = express();

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', apiLimiter);

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/agents', agentRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      error: 'Something went wrong!',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  return app;
};

const configureSockets = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOptions.origin,
      methods: ['GET', 'POST'],
      credentials: Boolean(corsOptions.credentials)
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-user', (userId) => {
      if (!userId) return;
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });

    socket.on('join-chat', (chatId) => {
      if (!chatId) return;
      socket.join(chatId);
      console.log(`User joined chat: ${chatId}`);
    });

    socket.on('leave-chat', (chatId) => {
      if (!chatId) return;
      socket.leave(chatId);
      console.log(`User left chat: ${chatId}`);
    });

    socket.on('typing-start', ({ chatId, userId }) => {
      if (!chatId || !userId) return;
      socket.to(chatId).emit('user-typing', {
        chatId,
        userId,
        typing: true
      });
    });

    socket.on('typing-stop', ({ chatId, userId }) => {
      if (!chatId || !userId) return;
      socket.to(chatId).emit('user-typing', {
        chatId,
        userId,
        typing: false
      });
    });

    socket.on('message-delivered', ({ messageId, chatId }) => {
      if (!messageId || !chatId) return;
      socket.to(chatId).emit('message-delivery-update', {
        messageId,
        status: 'delivered'
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

export const createServer = async () => {
  validateEnv();
  initErrorTracking();
  return configureApp();
};

export const startServer = async () => {
  const app = await createServer();
  const httpServer = createHttpServer(app);
  configureSockets(httpServer);

  const PORT = process.env.PORT || 5000;

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  });

  if (process.env.NODE_ENV === 'production') {
    createIndexes().catch((error) => {
      console.error('Error creating indexes:', error);
    });
  }

  return { app, httpServer, io };
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
