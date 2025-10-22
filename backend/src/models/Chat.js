import pool from '../config/database.js';
import { Message } from './Message.js';

export class Chat {
  static formatChat(row) {
    if (!row) return null;

    return {
      id: row.id,
      propertyId: row.property_id,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      propertyTitle: row.property_title,
      propertyImages: row.property_images || [],
      propertyPrice: row.property_price,
      propertyCurrency: row.property_currency,
      otherUserId: row.other_user_id,
      otherUserName: row.other_user_name,
      otherUserAvatar: row.other_user_avatar,
      otherUserRole: row.other_user_role,
      otherUserAgency: row.other_user_agency,
      unreadCount: row.unread_count !== undefined ? Number(row.unread_count) : undefined
    };
  }

  static async create(chatData) {
    const { propertyId = null, participants } = chatData;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const chatQuery = `
        INSERT INTO chats (property_id)
        VALUES ($1)
        RETURNING *
      `;
      const chatResult = await client.query(chatQuery, [propertyId]);
      const chat = chatResult.rows[0];

      const participantQuery = `
        INSERT INTO chat_participants (chat_id, user_id)
        VALUES ($1, $2)
      `;

      for (const participantId of participants) {
        await client.query(participantQuery, [chat.id, participantId]);
      }

      await client.query('COMMIT');
      return this.formatChat(chat);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByParticipants(userId1, userId2, propertyId = null) {
    let query = `
      SELECT c.*
      FROM chats c
      JOIN chat_participants cp1 ON c.id = cp1.chat_id
      JOIN chat_participants cp2 ON c.id = cp2.chat_id
      WHERE cp1.user_id = $1 AND cp2.user_id = $2
    `;

    const params = [userId1, userId2];

    if (propertyId) {
      query += ' AND c.property_id = $3';
      params.push(propertyId);
    } else {
      query += ' AND c.property_id IS NULL';
    }

    const result = await pool.query(query, params);
    return result.rows[0] ? this.formatChat(result.rows[0]) : null;
  }

  static async getUserChats(userId) {
    const query = `
      SELECT
        c.id,
        c.property_id,
        c.last_message,
        c.last_message_at,
        c.created_at,
        c.updated_at,
        p.title as property_title,
        p.images as property_images,
        p.price as property_price,
        p.currency as property_currency,
        other_user.id as other_user_id,
        other_user.name as other_user_name,
        other_user.avatar as other_user_avatar,
        other_user.role as other_user_role,
        a.agency as other_user_agency,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.chat_id = c.id
            AND m.sender_id != $1
            AND m.read = false
        ) as unread_count
      FROM chats c
      JOIN chat_participants cp ON c.id = cp.chat_id
      JOIN chat_participants cp_other ON c.id = cp_other.chat_id AND cp_other.user_id != $1
      JOIN users other_user ON cp_other.user_id = other_user.id
      LEFT JOIN agents a ON other_user.id = a.user_id
      LEFT JOIN properties p ON c.property_id = p.id
      WHERE cp.user_id = $1
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.map((row) => this.formatChat(row));
  }

  static async getWithMessages(chatId, userId) {
    const chatQuery = `
      SELECT
        c.*,
        p.title as property_title,
        p.images as property_images,
        p.price as property_price,
        p.currency as property_currency,
        other_user.id as other_user_id,
        other_user.name as other_user_name,
        other_user.avatar as other_user_avatar,
        other_user.role as other_user_role,
        a.agency as other_user_agency
      FROM chats c
      JOIN chat_participants cp ON c.id = cp.chat_id
      JOIN chat_participants cp_other ON c.id = cp_other.chat_id AND cp_other.user_id != $1
      JOIN users other_user ON cp_other.user_id = other_user.id
      LEFT JOIN agents a ON other_user.id = a.user_id
      LEFT JOIN properties p ON c.property_id = p.id
      WHERE c.id = $2 AND cp.user_id = $1
    `;

    const chatResult = await pool.query(chatQuery, [userId, chatId]);
    const chat = this.formatChat(chatResult.rows[0]);

    if (!chat) return null;

    const messages = await Message.getByChat(chatId);

    return {
      ...chat,
      messages
    };
  }

  static async isParticipant(chatId, userId) {
    const query = 'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2';
    const result = await pool.query(query, [chatId, userId]);
    return result.rows.length > 0;
  }

  static async updateLastMessage(chatId, lastMessage) {
    const query = `
      UPDATE chats
      SET last_message = $1, last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await pool.query(query, [lastMessage, chatId]);
  }

  static async getParticipants(chatId) {
    const query = `
      SELECT user_id
      FROM chat_participants
      WHERE chat_id = $1
    `;
    const result = await pool.query(query, [chatId]);
    return result.rows;
  }
}
