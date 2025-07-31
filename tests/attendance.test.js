import request from 'supertest';
import app from '../server.js';
import { sequelize, User, Attendance } from '../models/index.js';

describe('Attendance API', () => {
  let adminToken;
  let govToken;
  let adminUser;
  let govUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    
    // Create test users
    adminUser = await User.create({
      username: 'testadmin',
      email: 'testadmin@test.com',
      password: 'password123',
      role: 'admin',
      firstName: 'Test',
      lastName: 'Admin'
    });

    govUser = await User.create({
      username: 'testgov',
      email: 'testgov@test.com',
      password: 'password123',
      role: 'government',
      firstName: 'Test',
      lastName: 'Government'
    });

    // Get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'password123' });
    adminToken = adminLogin.body.data.token;

    const govLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testgov', password: 'password123' });
    govToken = govLogin.body.data.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/attendance', () => {
    it('should create attendance record as admin', async () => {
      const attendanceData = {
        staffName: 'John Doe',
        staffType: 'medical',
        attendanceDate: '2025-01-30',
        attendanceTime: '08:00:00',
        status: 'present',
        notes: 'On time'
      };

      const res = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(attendanceData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attendance.staffName).toBe('John Doe');
      expect(res.body.data.attendance.staffType).toBe('medical');
    });

    it('should not create attendance record as government user', async () => {
      const attendanceData = {
        staffName: 'Jane Doe',
        staffType: 'ground',
        attendanceDate: '2025-01-30',
        attendanceTime: '08:00:00'
      };

      const res = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${govToken}`)
        .send(attendanceData);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should not create duplicate attendance record', async () => {
      const attendanceData = {
        staffName: 'John Doe',
        staffType: 'medical',
        attendanceDate: '2025-01-30',
        attendanceTime: '09:00:00'
      };

      const res = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(attendanceData);

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('DUPLICATE_ATTENDANCE');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });
  });

  describe('GET /api/attendance', () => {
    it('should get attendance records as admin', async () => {
      const res = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attendance).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should get attendance records as government user', async () => {
      const res = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${govToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter attendance records by staff type', async () => {
      const res = await request(app)
        .get('/api/attendance?staffType=medical')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/attendance/:id', () => {
    let attendanceId;

    beforeAll(async () => {
      const attendance = await Attendance.create({
        staffName: 'Test Staff',
        staffType: 'ground',
        attendanceDate: '2025-01-30',
        attendanceTime: '08:00:00',
        recordedBy: adminUser.id
      });
      attendanceId = attendance.id;
    });

    it('should update attendance record as admin', async () => {
      const updateData = {
        status: 'late',
        notes: 'Arrived 15 minutes late'
      };

      const res = await request(app)
        .put(`/api/attendance/${attendanceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attendance.status).toBe('late');
    });

    it('should not update attendance record as government user', async () => {
      const res = await request(app)
        .put(`/api/attendance/${attendanceId}`)
        .set('Authorization', `Bearer ${govToken}`)
        .send({ status: 'present' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/attendance/report', () => {
    it('should get attendance report as admin', async () => {
      const res = await request(app)
        .get('/api/attendance/report')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.statusBreakdown).toBeDefined();
    });

    it('should get attendance report as government user', async () => {
      const res = await request(app)
        .get('/api/attendance/report')
        .set('Authorization', `Bearer ${govToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});