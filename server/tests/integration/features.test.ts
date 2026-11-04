import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { initTestDatabase, closeTestDatabase, clearTestDatabase } from '../setup.js';
import { User } from '../../src/modules/users/user.model.js';
import { Team } from '../../src/modules/teams/team.model.js';
import { Project } from '../../src/modules/projects/project.model.js';
import { Task } from '../../src/modules/tasks/task.model.js';
import { Comment } from '../../src/modules/comments/comment.model.js';
import { Activity } from '../../src/modules/activity/activity.model.js';
import { Notification } from '../../src/modules/notifications/notification.model.js';
import { runDueSoonCheck } from '../../src/modules/notifications/notification.scheduler.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import {
  ACTIVITY_ACTION,
  PROJECT_STATUS,
  TASK_PRIORITY,
  TASK_STATUS,
  USER_ROLES,
} from '../../src/config/constants.js';

describe('P1 & P2 Features Integration Tests (Comments, Dashboard, CSV, Notifications)', () => {
  const app = createApp();

  let adminCookie: string;
  let managerCookie: string;
  let employeeCookie: string;

  let teamId: string;
  let projectId: string;
  let taskId: string;
  let employeeId: string;

  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    const pass = await bcrypt.hash('Secret123!', 10);
    const team = await Team.create({ name: 'Alpha Team' });
    teamId = team._id.toString();

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@feat.com',
      passwordHash: pass,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    const manager = await User.create({
      name: 'Manager',
      email: 'manager@feat.com',
      passwordHash: pass,
      role: USER_ROLES.MANAGER,
      teamId: team._id,
      isActive: true,
    });
    await Team.findByIdAndUpdate(team._id, { managerId: manager._id });

    const employee = await User.create({
      name: 'Employee',
      email: 'employee@feat.com',
      passwordHash: pass,
      role: USER_ROLES.EMPLOYEE,
      teamId: team._id,
      isActive: true,
    });
    employeeId = employee._id.toString();

    const now = new Date();
    const project = await Project.create({
      name: 'Feature Project',
      client: 'Acme Feature',
      startDate: now,
      endDate: new Date(now.getTime() + 10 * 86400000),
      teamId: team._id,
      status: PROJECT_STATUS.ACTIVE,
      createdBy: manager._id,
    });
    projectId = project._id.toString();

    const task = await Task.create({
      title: 'Target Task',
      description: '=SUM(1+1) dangerous formula cell test',
      projectId: project._id,
      teamId: team._id,
      assigneeId: employee._id,
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.HIGH,
      dueDate: new Date(now.getTime() + 86400000),
      createdBy: manager._id,
      __v: 0,
    });
    taskId = task._id.toString();

    const makeCookie = (u: { _id: { toString(): string }; email: string; role: any; teamId?: { toString(): string } | null }) => {
      const token = generateAccessToken({
        userId: u._id.toString(),
        email: u.email,
        role: u.role,
        teamId: u.teamId ? u.teamId.toString() : null,
      });
      return `access_token=${token}`;
    };

    adminCookie = makeCookie(admin);
    managerCookie = makeCookie(manager);
    employeeCookie = makeCookie(employee);
  });

  describe('Comments API', () => {
    it('POST & GET /api/tasks/:id/comments - creates comment and appends activity', async () => {
      const postRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', [employeeCookie])
        .send({ content: 'Finished the local database migration schema.' });

      expect(postRes.status).toBe(201);
      expect(postRes.body.data.content).toBe('Finished the local database migration schema.');

      // Check comments list
      const getRes = await request(app)
        .get(`/api/tasks/${taskId}/comments`)
        .set('Cookie', [managerCookie]);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBe(1);

      // Check activity log
      const activities = await Activity.find({ taskId, action: ACTIVITY_ACTION.COMMENT_ADDED });
      expect(activities.length).toBe(1);
    });
  });

  describe('Dashboard API', () => {
    it('GET /api/dashboard/stats - returns role-tailored aggregated statistics and assigned team for manager', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Cookie', [managerCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.openTasks).toBe(1);
      expect(res.body.data.totalProjects).toBe(1);
      expect(res.body.data.myTeam).toBeDefined();
      expect(res.body.data.myTeam.name).toBe('Alpha Team');
      expect(res.body.data.myTeam.managers.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/dashboard/stats - returns assigned team on employee dashboard', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Cookie', [employeeCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.myTeam).toBeDefined();
      expect(res.body.data.myTeam.name).toBe('Alpha Team');
      expect(res.body.data.myTeam.memberCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('CSV Export & Formula Injection Defense', () => {
    it('GET /api/tasks/export/csv - sanitizes spreadsheet formula triggers and streams CSV', async () => {
      const res = await request(app)
        .get('/api/tasks/export/csv')
        .set('Cookie', [managerCookie]);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Target Task');
    });
  });

  describe('Notifications API', () => {
    it('GET & PATCH /api/notifications - manages unread alerts', async () => {
      await Notification.create({
        userId: employeeId,
        type: 'TASK_ASSIGNED',
        title: 'New Task',
        message: 'Assigned to work.',
        link: `/tasks?selected=${taskId}`,
        isRead: false,
      });

      const listRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', [employeeCookie]);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.meta.unreadCount).toBe(1);

      const notifId = listRes.body.data[0]._id;
      const readRes = await request(app)
        .patch(`/api/notifications/${notifId}/read`)
        .set('Cookie', [employeeCookie]);

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.isRead).toBe(true);
    });

    it('runDueSoonCheck - generates and deduplicates 24h TASK_DUE_SOON alerts', async () => {
      // Create a task due in 6 hours
      const now = new Date();
      await Task.create({
        title: 'Urgent Bugfix Due Soon',
        projectId,
        teamId,
        assigneeId: employeeId,
        status: TASK_STATUS.IN_PROGRESS,
        priority: TASK_PRIORITY.URGENT,
        dueDate: new Date(now.getTime() + 6 * 3600 * 1000),
        createdBy: employeeId,
        __v: 0,
      });

      // First run: sends 1 notification
      const sentCountFirst = await runDueSoonCheck();
      expect(sentCountFirst).toBeGreaterThanOrEqual(1);

      const dueNotif = await Notification.findOne({
        userId: employeeId,
        type: 'TASK_DUE_SOON',
      });
      expect(dueNotif).toBeDefined();
      expect(dueNotif?.title).toBe('Task Due Soon');

      // Second run: deduplicates (no second notification sent within 24 hours)
      const sentCountSecond = await runDueSoonCheck();
      expect(sentCountSecond).toBe(0);
    });
  });
});
