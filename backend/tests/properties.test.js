import request from 'supertest';
import { app, clearTestData, pool } from './setup.js';

describe('Properties API', () => {
  let authToken;
  let testUser;
  let testAgent;

  beforeEach(async () => {
    await clearTestData();

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Property Test User',
        email: 'propertytest@example.com',
        password: 'password123',
        role: 'agent'
      });

    authToken = registerResponse.body.data.token;
    testUser = registerResponse.body.data.user;

    const agentResult = await pool.query('SELECT * FROM agents WHERE user_id = $1', [testUser.id]);
    testAgent = agentResult.rows[0];
  });

  describe('POST /api/properties', () => {
    test('should create a new property successfully', async () => {
      const propertyData = {
        title: 'Beautiful Apartment in Tirana',
        description: 'A modern apartment in the city center',
        type: 'sale',
        category: 'residential',
        price: 85000,
        currency: 'EUR',
        city: 'Tirana',
        municipality: 'Tirana',
        address: 'Rruga Myslym Shyri',
        latitude: 41.3275,
        longitude: 19.8187,
        bedrooms: 2,
        bathrooms: 1,
        area: 75,
        floor: 3,
        totalFloors: 5,
        yearBuilt: 2015,
        features: ['Parking', 'Elevator', 'Balcony']
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.property.title).toBe(propertyData.title);
      expect(response.body.data.property.agentId).toBe(testAgent.id);
      expect(response.body.data.property.isVerified).toBe(false);
    });

    test('should reject property creation without authentication', async () => {
      const response = await request(app)
        .post('/api/properties')
        .send({ title: 'Test Property' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Incomplete Property'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });
  });

  describe('GET /api/properties', () => {
    beforeEach(async () => {
      await pool.query(`
        INSERT INTO properties (title, description, type, category, price, currency, city, address, area, agent_id)
        VALUES 
        ('Property 1', 'Description 1', 'sale', 'residential', 100000, 'EUR', 'Tirana', 'Address 1', 80, $1),
        ('Property 2', 'Description 2', 'rent', 'commercial', 500, 'EUR', 'Durrës', 'Address 2', 120, $1),
        ('Property 3', 'Description 3', 'sale', 'residential', 75000, 'EUR', 'Tirana', 'Address 3', 65, $1)
      `, [testAgent.id]);
    });

    test('should get properties with pagination', async () => {
      const response = await request(app)
        .get('/api/properties?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(2);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.page).toBe(1);
    });

    test('should filter properties by city', async () => {
      const response = await request(app)
        .get('/api/properties?city=Tirana')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(2);
      expect(response.body.data.properties.every((p) => p.location.city === 'Tirana')).toBe(true);
    });

    test('should filter properties by type', async () => {
      const response = await request(app)
        .get('/api/properties?type=rent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(1);
      expect(response.body.data.properties[0].type).toBe('rent');
    });
  });

  describe('GET /api/properties/:id', () => {
    let testProperty;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO properties (title, description, type, category, price, currency, city, address, area, agent_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        'Test Property',
        'Test Description',
        'sale',
        'residential',
        100000,
        'EUR',
        'Tirana',
        'Test Address',
        80,
        testAgent.id
      ]);

      testProperty = result.rows[0];
    });

    test('should get property by ID', async () => {
      const response = await request(app)
        .get(`/api/properties/${testProperty.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.property.id).toBe(testProperty.id);
      expect(response.body.data.property.title).toBe('Test Property');
    });

    test('should increment views counter', async () => {
      await request(app).get(`/api/properties/${testProperty.id}`);
      await request(app).get(`/api/properties/${testProperty.id}`);

      const result = await pool.query('SELECT views FROM properties WHERE id = $1', [testProperty.id]);
      expect(result.rows[0].views).toBe(2);
    });

    test('should return 404 for non-existent property', async () => {
      const response = await request(app)
        .get('/api/properties/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
