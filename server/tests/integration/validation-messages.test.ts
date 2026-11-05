import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { initTestDatabase, closeTestDatabase, clearTestDatabase } from '../setup.js';
import { User } from '../../src/modules/users/user.model.js';
import { Team } from '../../src/modules/teams/team.model.js';
import { Project } from '../../src/modules/projects/project.model.js';
import { USER_ROLES } from '../../src/config/constants.js';
import { generateAccessToken } from '../../src/utils/tokens.js';

describe('Meaningful Input Validation Error Messages Integration Tests', () => {
  const app = createApp();

  let adminCookie: string;
  let teamId: string;
  let employeeId: string;
  let projectId: string;

  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    const pass = await bcrypt.hash('AdminSecret123!', 10);

    const team = await Team.create({ name: 'Core Platform Team' });
    teamId = team._id.toString();

    const admin = await User.create({
      name: 'Global Administrator',
      email: 'admin@actowiz.com',
      passwordHash: pass,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    const employee = await User.create({
      name: 'Dev Employee',
      email: 'dev@actowiz.com',
      passwordHash: pass,
      role: USER_ROLES.EMPLOYEE,
      teamId: team._id,
      isActive: true,
    });
    employeeId = employee._id.toString();

    const project = await Project.create({
      name: 'Infrastructure V2',
      client: 'Actowiz Internal',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      teamId: team._id,
      createdBy: admin._id,
    });
    projectId = project._id.toString();

    const adminToken = generateAccessToken({
      userId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      teamId: null,
    });
    adminCookie = `access_token=${adminToken}`;
  });

  it('POST /api/users - returns explicit message when password is less than 8 characters', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', [adminCookie])
      .send({
        name: 'Johnathan Doe',
        email: 'johnathan@actowiz.com',
        password: '12345', // 5 characters
        role: USER_ROLES.EMPLOYEE,
        teamId,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('Password must be at least 8 characters long');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'password',
          message: 'Password must be at least 8 characters long',
        }),
      ])
    );
  });

  it('POST /api/users - returns explicit message when name is shorter than 2 characters', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', [adminCookie])
      .send({
        name: 'J',
        email: 'j@actowiz.com',
        password: 'ValidPassword123!',
        role: USER_ROLES.ADMIN,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Name must be at least 2 characters long');
  });

  it('POST /api/users - returns explicit message when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', [adminCookie])
      .send({
        name: 'Jane Doe',
        email: 'invalid-email-format',
        password: 'ValidPassword123!',
        role: USER_ROLES.ADMIN,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Please enter a valid email address');
  });

  it('POST /api/users - returns explicit message when teamId is omitted for Employee role', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', [adminCookie])
      .send({
        name: 'Jane Employee',
        email: 'jane.emp@actowiz.com',
        password: 'ValidPassword123!',
        role: USER_ROLES.EMPLOYEE,
        // teamId omitted
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Team assignment is required for Managers and Employees');
  });

  it('POST /api/tasks - returns explicit message when task title is less than 3 characters', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', [adminCookie])
      .send({
        title: 'AB', // < 3 characters
        projectId,
        teamId,
        assigneeId: employeeId,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Task title must be at least 3 characters long');
  });

  it('POST /api/teams - returns explicit message when team name is less than 2 characters', async () => {
    const res = await request(app)
      .post('/api/teams')
      .set('Cookie', [adminCookie])
      .send({
        name: 'T',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Team name must be at least 2 characters long');
  });

  it('POST /api/projects - returns explicit message when project name is less than 2 characters', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', [adminCookie])
      .send({
        name: 'P',
        client: 'Valid Client',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        teamId,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Project name must be at least 2 characters long');
  });
});
