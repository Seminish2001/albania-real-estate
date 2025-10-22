import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import userRoutes from './routes/users.js';
import agentRoutes from './routes/agents.js';
import chatRoutes from './routes/chat.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Socket.io for real-time chat
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

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

export { io };
