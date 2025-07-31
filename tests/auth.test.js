import request from 'supertest';
import app from '../server.js';
import { sequelize, User } from '../models/index.js';

describe('Authentication', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    
    // Create test users
    await User.create({
      username: 'testadmin',
      email: 'testadmin@test.com',
      password: 'password123',
      role: 'admin',
      firstName: 'Test',
      lastName: 'Admin'
    });

    await User.create({
      username: 'testgov',
      email: 'testgov@test.com',
      password: 'password123',
      role: 'government',
      firstName: 'Test',
      lastName: 'Government'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('admin');
    });

    it('should not login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should not login without credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MISSING_CREDENTIALS');
    });
  });

  describe('GET /api/auth/verify', () => {
    let token;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });
      token = loginRes.body.data.token;
    });

    it('should verify valid token', async () => {
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
    });

    it('should not verify invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should not verify without token', async () => {
      const res = await request(app)
        .get('/api/auth/verify');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let token;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });
      token = loginRes.body.data.token;
    });

    it('should logout with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});