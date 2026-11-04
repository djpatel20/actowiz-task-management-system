import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { initTestDatabase, closeTestDatabase, clearTestDatabase } from '../setup.js';
import { User } from '../../src/modules/users/user.model.js';
import { RefreshToken } from '../../src/modules/auth/session.model.js';
import { USER_ROLES } from '../../src/config/constants.js';

describe('Auth Endpoints Integration Tests', () => {
  const app = createApp();

  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('POST /api/auth/login - successfully authenticates and sets HttpOnly cookies', async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      passwordHash,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'TestPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('admin@test.com');
    expect(res.body.data.user.role).toBe(USER_ROLES.ADMIN);

    // Verify HttpOnly cookies
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    const hasAccessToken = cookies.some((c) => c.includes('access_token=') && c.includes('HttpOnly'));
    const hasRefreshToken = cookies.some((c) => c.includes('refresh_token=') && c.includes('HttpOnly'));
    expect(hasAccessToken).toBe(true);
    expect(hasRefreshToken).toBe(true);

    // Verify session persisted in MongoDB
    const sessionCount = await RefreshToken.countDocuments();
    expect(sessionCount).toBe(1);
  });

  it('POST /api/auth/login - rejects invalid credentials with generic message', async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      passwordHash,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('POST /api/auth/login - rejects inactive deactivated user', async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    await User.create({
      name: 'Inactive User',
      email: 'inactive@test.com',
      passwordHash,
      role: USER_ROLES.EMPLOYEE,
      isActive: false,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactive@test.com', password: 'TestPass123!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/refresh - rotates refresh token session', async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      passwordHash,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'TestPass123!' });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie!]);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);

    // Old session revoked, new session created
    const activeSessions = await RefreshToken.find({ isRevoked: false });
    const revokedSessions = await RefreshToken.find({ isRevoked: true });
    expect(activeSessions.length).toBe(1);
    expect(revokedSessions.length).toBe(1);
  });

  it('POST /api/auth/logout - revokes session and clears cookies', async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      passwordHash,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'TestPass123!' });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [refreshCookie!]);

    expect(logoutRes.status).toBe(200);
    const activeSessions = await RefreshToken.find({ isRevoked: false });
    expect(activeSessions.length).toBe(0);
  });

  it('GET /api/auth/me - returns user profile with team context', async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      passwordHash,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'TestPass123!' });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const accessCookie = cookies.find((c) => c.startsWith('access_token='));

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [accessCookie!]);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.name).toBe('Test Admin');
    expect(meRes.body.data.user.role).toBe(USER_ROLES.ADMIN);
  });
});
