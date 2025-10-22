import pool from '../config/database.js';

export class Message {
  static formatMessage(row) {
    if (!row) return null;

    return {
      id: row.id,
      chatId: row.chat_id,
      senderId: row.sender_id,
      content: row.content,
      type: row.type,
      read: row.read,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      senderName: row.sender_name,
      senderAvatar: row.sender_avatar,
      senderRole: row.sender_role
    };
  }

  static async create(messageData) {
    const { chatId, senderId, content, type = 'text' } = messageData;

    const query = `
      INSERT INTO messages (chat_id, sender_id, content, type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [chatId, senderId, content, type]);
    return this.formatMessage(result.rows[0]);
  }

  static async getByChat(chatId) {
    const query = `
      SELECT
        m.*,
        u.name as sender_name,
        u.avatar as sender_avatar,
        u.role as sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1
      ORDER BY m.created_at ASC
    `;

    const result = await pool.query(query, [chatId]);
    return result.rows.map((row) => this.formatMessage(row));
  }

  static async getWithSender(messageId) {
    const query = `
      SELECT
        m.*,
        u.name as sender_name,
        u.avatar as sender_avatar,
        u.role as sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = $1
    `;

    const result = await pool.query(query, [messageId]);
    return this.formatMessage(result.rows[0]);
  }

  static async markAsRead(chatId, userId) {
    const query = `
      UPDATE messages
      SET read = true
      WHERE chat_id = $1
        AND sender_id != $2
        AND read = false
    `;

    await pool.query(query, [chatId, userId]);
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*)
      FROM messages m
      JOIN chat_participants cp ON m.chat_id = cp.chat_id
      WHERE cp.user_id = $1
        AND m.sender_id != $1
        AND m.read = false
    `;

    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }
}
