import request from 'supertest';
import { app, clearTestData, pool } from '../setup.js';

describe('Property Workflow Integration', () => {
  let userToken, agentToken, adminToken;
  let userId, agentId, adminId;
  let testProperty;

  beforeAll(async () => {
    await clearTestData();

    // Create test users
    const userRes = await request(app).post('/api/auth/register').send({
      name: 'Test User', email: 'user@test.com', password: 'Password123!', role: 'user'
    });
    userToken = userRes.body.data.token;
    userId = userRes.body.data.user.id;

    const agentRes = await request(app).post('/api/auth/register').send({
      name: 'Test Agent', email: 'agent@test.com', password: 'Password123!', role: 'agent'
    });
    agentToken = agentRes.body.data.token;
    agentId = agentRes.body.data.user.id;

    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Test Admin', email: 'admin@test.com', password: 'Password123!', role: 'admin'
    });
    adminToken = adminRes.body.data.token;
    adminId = adminRes.body.data.user.id;

    await pool.query("UPDATE users SET email_verified = TRUE, is_verified = TRUE WHERE id IN ($1, $2, $3)", [
      userId,
      agentId,
      adminId
    ]);
  });

  afterAll(async () => {
    await clearTestData();
  });

  test('Complete property lifecycle: create → verify → favorite → chat → sold', async () => {
    // 1. Agent creates property
    const createRes = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        title: 'Beautiful Villa in Durrës',
        description: 'Luxury villa with sea view and modern amenities located near the coastline.',
        type: 'sale',
        category: 'residential',
        price: 250000,
        currency: 'EUR',
        city: 'Durrës',
        municipality: 'Durrës',
        address: 'Rruga Lidhja e Prizrenit',
        latitude: 41.3167,
        longitude: 19.45,
        bedrooms: 4,
        bathrooms: 3,
        area: 200,
        features: ['Swimming Pool', 'Garden', 'Parking']
      })
      .expect(201);

    testProperty = createRes.body.data.property;
    expect(testProperty.isVerified ?? false).toBe(false);

    // 2. Admin verifies property
    const verifyRes = await request(app)
      .post(`/api/admin/properties/${testProperty.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(verifyRes.body.data.property.isVerified).toBe(true);

    // 3. User favorites property
    const favoriteRes = await request(app)
      .post(`/api/properties/${testProperty.id}/favorite`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(favoriteRes.body.data.isFavorited).toBe(true);

    // 4. User starts chat with agent
    const chatRes = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        participantId: agentId,
        propertyId: testProperty.id
      })
      .expect(200);

    const chatId = chatRes.body.data.chat.id;

    // 5. Send messages
    await request(app)
      .post(`/api/chat/${chatId}/messages`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Is this property still available?' })
      .expect(200);

    await request(app)
      .post(`/api/chat/${chatId}/messages`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ content: 'Yes, it is available for viewing.' })
      .expect(200);

    // 6. Agent marks property as sold
    const updateRes = await request(app)
      .put(`/api/properties/${testProperty.id}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'sold' })
      .expect(200);

    expect(updateRes.body.data.property.status).toBe('sold');
  });

  test('Edge case: User cannot create property', async () => {
    await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'User trying to create property',
        description: 'This should fail due to role restrictions and validation rules for non-agents.',
        type: 'sale',
        category: 'residential',
        price: 100000,
        city: 'Tirana',
        municipality: 'Tirana',
        address: 'Main Street 1',
        latitude: 41.3275,
        longitude: 19.8187,
        area: 100
      })
      .expect(403);
  });

  test('Edge case: Invalid property data', async () => {
    const response = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        title: 'A',
        description: 'Too short',
        type: 'sale',
        category: 'residential',
        price: -100,
        city: 'Tirana',
        municipality: 'Tirana',
        address: 'Invalid Address',
        latitude: 1000,
        longitude: 19.82,
        area: -50
      })
      .expect(400);

    expect(response.body.details).toBeDefined();
    expect(response.body.details.length).toBeGreaterThan(0);
  });
});
