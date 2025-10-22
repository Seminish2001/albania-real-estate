import express from 'express';
import { body, validationResult } from 'express-validator';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { authenticate } from '../middleware/auth.js';
import { io } from '../server.js';

const router = express.Router();

// Get user's chats
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.getUserChats(userId);

    res.json({
      success: true,
      data: { chats }
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get or create chat
router.post('/', authenticate, [
  body('propertyId').optional().isUUID(),
  body('participantId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { propertyId, participantId } = req.body;
    const userId = req.user.id;

    let chat = await Chat.findByParticipants(userId, participantId, propertyId);

    if (!chat) {
      chat = await Chat.create({
        propertyId: propertyId || null,
        participants: [userId, participantId]
      });
    }

    const chatWithMessages = await Chat.getWithMessages(chat.id, userId);

    res.json({
      success: true,
      data: { chat: chatWithMessages }
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get chat messages
router.get('/:chatId/messages', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const isParticipant = await Chat.isParticipant(chatId, userId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this chat'
      });
    }

    const messages = await Message.getByChat(chatId);

    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Send message
router.post('/:chatId/messages', authenticate, [
  body('content').notEmpty().trim(),
  body('type').optional().isIn(['text', 'image', 'file'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { chatId } = req.params;
    const { content, type = 'text' } = req.body;
    const userId = req.user.id;

    const isParticipant = await Chat.isParticipant(chatId, userId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to send messages in this chat'
      });
    }

    const message = await Message.create({
      chatId,
      senderId: userId,
      content,
      type
    });

    await Chat.updateLastMessage(chatId, content);

    const messageWithSender = await Message.getWithSender(message.id);

    const participants = await Chat.getParticipants(chatId);
    participants.forEach((participant) => {
      io.to(participant.user_id).emit('new-message', {
        chatId,
        message: messageWithSender
      });
    });

    participants.forEach((participant) => {
      io.to(participant.user_id).emit('chat-updated', {
        chatId,
        lastMessage: content,
        lastMessageAt: messageWithSender.createdAt
      });
    });

    res.json({
      success: true,
      data: { message: messageWithSender }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Mark messages as read
router.put('/:chatId/messages/read', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const isParticipant = await Chat.isParticipant(chatId, userId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this chat'
      });
    }

    await Message.markAsRead(chatId, userId);

    const participants = await Chat.getParticipants(chatId);
    participants.forEach((participant) => {
      if (participant.user_id !== userId) {
        io.to(participant.user_id).emit('messages-read', {
          chatId,
          readerId: userId
        });
      }
    });

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get unread message count
router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Message.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
