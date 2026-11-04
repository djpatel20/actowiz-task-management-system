import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { initTestDatabase, closeTestDatabase, clearTestDatabase } from '../setup.js';
import { User } from '../../src/modules/users/user.model.js';
import { Team } from '../../src/modules/teams/team.model.js';
import { Project } from '../../src/modules/projects/project.model.js';
import { Task } from '../../src/modules/tasks/task.model.js';
import { USER_ROLES, TASK_STATUS, TASK_PRIORITY } from '../../src/config/constants.js';
import { generateAccessToken } from '../../src/utils/tokens.js';

describe('Date Validation Integration Tests (Disallow Past Dates)', () => {
  const app = createApp();

  let adminCookie: string;
  let adminId: string;
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

    const pass = await bcrypt.hash('Secret123!', 10);

    const team = await Team.create({ name: 'Alpha Squad' });
    teamId = team._id.toString();

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@actowiz.com',
      passwordHash: pass,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });
    adminId = admin._id.toString();

    const employee = await User.create({
      name: 'John Doe',
      email: 'john@actowiz.com',
      passwordHash: pass,
      role: USER_ROLES.EMPLOYEE,
      teamId: team._id,
      teamIds: [team._id],
      isActive: true,
    });
    employeeId = employee._id.toString();

    const project = await Project.create({
      name: 'Core Platform',
      client: 'Acme Corp',
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

  describe('Task Due Date Validation', () => {
    it('POST /api/tasks - rejects past due dates with 400 Bad Request', async () => {
      const pastDate = '2024-01-01T12:00:00.000Z';

      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', [adminCookie])
        .send({
          title: 'Past Due Task',
          projectId,
          teamId,
          assigneeId: employeeId,
          priority: TASK_PRIORITY.HIGH,
          dueDate: pastDate,
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Due date cannot be in the past/i);
    });

    it('POST /api/tasks - allows today and future due dates with 201 Created', async () => {
      const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();

      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', [adminCookie])
        .send({
          title: 'Future Due Task',
          projectId,
          teamId,
          assigneeId: employeeId,
          priority: TASK_PRIORITY.MEDIUM,
          dueDate: futureDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Future Due Task');
    });

    it('PATCH /api/tasks/:id - rejects updating to a past due date with 400 Bad Request', async () => {
      const task = await Task.create({
        title: 'Existing Task',
        projectId,
        teamId,
        assigneeId: employeeId,
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.LOW,
        dueDate: new Date(Date.now() + 5 * 86400000),
        createdBy: adminId,
        __v: 0,
      });

      const pastDate = '2023-05-15T09:00:00.000Z';
      const res = await request(app)
        .patch(`/api/tasks/${task._id}`)
        .set('Cookie', [adminCookie])
        .send({
          dueDate: pastDate,
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Due date cannot be in the past/i);
    });
  });

  describe('Project Dates Validation', () => {
    it('POST /api/projects - rejects past start date with 400 Bad Request', async () => {
      const pastStartDate = '2024-01-01T00:00:00.000Z';
      const futureEndDate = new Date(Date.now() + 30 * 86400000).toISOString();

      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', [adminCookie])
        .send({
          name: 'Past Start Project',
          client: 'Client Past',
          startDate: pastStartDate,
          endDate: futureEndDate,
          teamId,
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Start date cannot be in the past/i);
    });

    it('POST /api/projects - rejects past end date with 400 Bad Request', async () => {
      const pastDate = '2023-12-01T00:00:00.000Z';

      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', [adminCookie])
        .send({
          name: 'Past End Project',
          client: 'Client Past',
          startDate: pastDate,
          endDate: pastDate,
          teamId,
        });

      expect(res.status).toBe(400);
    });

    it('POST /api/projects - allows future project dates with 201 Created', async () => {
      const futureStart = new Date(Date.now() + 86400000).toISOString();
      const futureEnd = new Date(Date.now() + 60 * 86400000).toISOString();

      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', [adminCookie])
        .send({
          name: 'Valid Project',
          client: 'Valid Client',
          startDate: futureStart,
          endDate: futureEnd,
          teamId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Valid Project');
    });

    it('PATCH /api/projects/:id - rejects updating start date to past date with 400 Bad Request', async () => {
      const pastDate = '2023-01-01T00:00:00.000Z';

      const res = await request(app)
        .patch(`/api/projects/${projectId}`)
        .set('Cookie', [adminCookie])
        .send({
          startDate: pastDate,
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Start date cannot be in the past/i);
    });
  });
});
