import request from 'supertest';
import { app, clearTestData, pool } from './setup.js';

describe('Chat API', () => {
  let user1Token, user2Token;
  let user1, user2;
  let testProperty;

  beforeEach(async () => {
    await clearTestData();

    const user1Response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Chat User 1',
        email: 'chat1@example.com',
        password: 'password123',
        role: 'user'
      });

    const user2Response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Chat User 2',
        email: 'chat2@example.com',
        password: 'password123',
        role: 'agent'
      });

    user1Token = user1Response.body.data.token;
    user2Token = user2Response.body.data.token;
    user1 = user1Response.body.data.user;
    user2 = user2Response.body.data.user;

    const agentResult = await pool.query('SELECT * FROM agents WHERE user_id = $1', [user2.id]);
    const agent = agentResult.rows[0];

    const propertyResult = await pool.query(`
      INSERT INTO properties (title, description, type, category, price, currency, city, address, area, agent_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      'Chat Test Property',
      'Test Description',
      'sale',
      'residential',
      100000,
      'EUR',
      'Tirana',
      'Test Address',
      80,
      agent.id
    ]);

    testProperty = propertyResult.rows[0];
  });

  describe('POST /api/chat', () => {
    test('should create a new chat between users', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantId: user2.id,
          propertyId: testProperty.id
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chat.participants).toContain(user1.id);
      expect(response.body.data.chat.participants).toContain(user2.id);
      expect(response.body.data.chat.propertyId).toBe(testProperty.id);
    });

    test('should return existing chat if already exists', async () => {
      const firstResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantId: user2.id,
          propertyId: testProperty.id
        });

      const secondResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantId: user2.id,
          propertyId: testProperty.id
        });

      expect(secondResponse.body.success).toBe(true);
      expect(secondResponse.body.data.chat.id).toBe(firstResponse.body.data.chat.id);
    });
  });

  describe('GET /api/chat', () => {
    test('should get user chats', async () => {
      await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantId: user2.id,
          propertyId: testProperty.id
        });

      const response = await request(app)
        .get('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chats).toHaveLength(1);
      expect(response.body.data.chats[0].other_user_id).toBe(user2.id);
    });
  });

  describe('POST /api/chat/:chatId/messages', () => {
    let chatId;

    beforeEach(async () => {
      const chatResponse = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantId: user2.id,
          propertyId: testProperty.id
        });

      chatId = chatResponse.body.data.chat.id;
    });

    test('should send a message in chat', async () => {
      const response = await request(app)
        .post(`/api/chat/${chatId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Hello, is this property still available?',
          type: 'text'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message.content).toBe('Hello, is this property still available?');
      expect(response.body.data.message.senderId).toBe(user1.id);
    });

    test('should reject message from non-participant', async () => {
      const user3Response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'User 3',
          email: 'user3@example.com',
          password: 'password123'
        });

      const user3Token = user3Response.body.data.token;

      const response = await request(app)
        .post(`/api/chat/${chatId}/messages`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          content: 'Trying to send message'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
