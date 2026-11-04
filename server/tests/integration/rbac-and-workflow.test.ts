import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { initTestDatabase, closeTestDatabase, clearTestDatabase } from '../setup.js';
import { User } from '../../src/modules/users/user.model.js';
import { Team } from '../../src/modules/teams/team.model.js';
import { Project } from '../../src/modules/projects/project.model.js';
import { Task } from '../../src/modules/tasks/task.model.js';
import { Activity } from '../../src/modules/activity/activity.model.js';
import {
  ACTIVITY_ACTION,
  PROJECT_STATUS,
  TASK_PRIORITY,
  TASK_STATUS,
  USER_ROLES,
} from '../../src/config/constants.js';
import { generateAccessToken } from '../../src/utils/tokens.js';

describe('RBAC & Centralized Task Workflow Integration Tests', () => {
  const app = createApp();

  let adminCookie: string;
  let managerAlphaCookie: string;
  let managerBetaCookie: string;
  let employeeElenaCookie: string;
  let employeeMayaCookie: string;

  let teamAlphaId: string;
  let teamBetaId: string;
  let projectAlphaId: string;
  let elenaId: string;
  let mayaId: string;

  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    const pass = await bcrypt.hash('Secret123!', 10);

    // Create Teams
    const teamAlpha = await Team.create({ name: 'Team Alpha' });
    const teamBeta = await Team.create({ name: 'Team Beta' });
    teamAlphaId = teamAlpha._id.toString();
    teamBetaId = teamBeta._id.toString();

    // Create Users
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@test.com',
      passwordHash: pass,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    const managerAlpha = await User.create({
      name: 'Manager Alpha',
      email: 'mgr.alpha@test.com',
      passwordHash: pass,
      role: USER_ROLES.MANAGER,
      teamId: teamAlpha._id,
      isActive: true,
    });
    await Team.findByIdAndUpdate(teamAlpha._id, { managerId: managerAlpha._id });

    const managerBeta = await User.create({
      name: 'Manager Beta',
      email: 'mgr.beta@test.com',
      passwordHash: pass,
      role: USER_ROLES.MANAGER,
      teamId: teamBeta._id,
      isActive: true,
    });
    await Team.findByIdAndUpdate(teamBeta._id, { managerId: managerBeta._id });

    const elena = await User.create({
      name: 'Elena Rostova',
      email: 'elena@test.com',
      passwordHash: pass,
      role: USER_ROLES.EMPLOYEE,
      teamId: teamAlpha._id,
      isActive: true,
    });
    elenaId = elena._id.toString();

    const maya = await User.create({
      name: 'Maya Patel',
      email: 'maya@test.com',
      passwordHash: pass,
      role: USER_ROLES.EMPLOYEE,
      teamId: teamBeta._id,
      isActive: true,
    });
    mayaId = maya._id.toString();

    // Create Project
    const now = new Date();
    const projectAlpha = await Project.create({
      name: 'Alpha Project',
      client: 'Acme Corp',
      startDate: now,
      endDate: new Date(now.getTime() + 10 * 86400000),
      teamId: teamAlpha._id,
      status: PROJECT_STATUS.ACTIVE,
      createdBy: managerAlpha._id,
    });
    projectAlphaId = projectAlpha._id.toString();

    // Generate tokens directly for fast and isolated test execution
    const makeCookie = (user: { _id: { toString(): string }; email: string; role: any; teamId?: { toString(): string } | null }) => {
      const token = generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        teamId: user.teamId ? user.teamId.toString() : null,
      });
      return `access_token=${token}`;
    };

    adminCookie = makeCookie(admin);
    managerAlphaCookie = makeCookie(managerAlpha);
    managerBetaCookie = makeCookie(managerBeta);
    employeeElenaCookie = makeCookie(elena);
    employeeMayaCookie = makeCookie(maya);
  });

  describe('1. Role-Based Access Control (RBAC)', () => {
    it('Admin can list all users; Manager and Employee are forbidden (403)', async () => {
      const adminRes = await request(app).get('/api/users').set('Cookie', [adminCookie]);
      expect(adminRes.status).toBe(200);

      const managerRes = await request(app).get('/api/users').set('Cookie', [managerAlphaCookie]);
      expect(managerRes.status).toBe(403);

      const empRes = await request(app).get('/api/users').set('Cookie', [employeeElenaCookie]);
      expect(empRes.status).toBe(403);
    });

    it('Manager Beta cannot view or access Team Alpha task (IDOR prevention returns 404)', async () => {
      const task = await Task.create({
        title: 'Alpha Secret Task',
        projectId: projectAlphaId,
        teamId: teamAlphaId,
        assigneeId: elenaId,
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.HIGH,
        dueDate: new Date(),
        createdBy: elenaId,
        __v: 0,
      });

      // Manager Beta attempts to view Team Alpha task
      const res = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Cookie', [managerBetaCookie]);

      expect(res.status).toBe(404);
    });

    it('Employee Maya cannot view task assigned to Elena (IDOR prevention returns 404)', async () => {
      const task = await Task.create({
        title: 'Elena Assigned Task',
        projectId: projectAlphaId,
        teamId: teamAlphaId,
        assigneeId: elenaId,
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.HIGH,
        dueDate: new Date(),
        createdBy: elenaId,
        __v: 0,
      });

      const res = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Cookie', [employeeMayaCookie]);

      expect(res.status).toBe(404);
    });

    it('Employee cannot create a task (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', [employeeElenaCookie])
        .send({
          title: 'Unauthorized Task',
          projectId: projectAlphaId,
          teamId: teamAlphaId,
          assigneeId: elenaId,
          dueDate: new Date().toISOString(),
        });

      expect(res.status).toBe(403);
    });
  });

  describe('2. Centralized Task Workflow & OCC', () => {
    it('Employee can progress assigned task: TODO -> IN_PROGRESS -> IN_REVIEW', async () => {
      const task = await Task.create({
        title: 'Normal Workflow Task',
        projectId: projectAlphaId,
        teamId: teamAlphaId,
        assigneeId: elenaId,
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.MEDIUM,
        dueDate: new Date(),
        createdBy: elenaId,
        __v: 0,
      });

      // 1. TODO -> IN_PROGRESS
      const startRes = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Cookie', [employeeElenaCookie])
        .send({ status: TASK_STATUS.IN_PROGRESS, version: 0 });

      expect(startRes.status).toBe(200);
      expect(startRes.body.data.status).toBe(TASK_STATUS.IN_PROGRESS);
      expect(startRes.body.data.__v).toBe(1);

      // Check activity log
      const startActivities = await Activity.find({ taskId: task._id });
      expect(startActivities.some((a) => a.action === ACTIVITY_ACTION.STATUS_CHANGED && a.newValue === TASK_STATUS.IN_PROGRESS)).toBe(true);

      // 2. IN_PROGRESS -> IN_REVIEW
      const reviewRes = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Cookie', [employeeElenaCookie])
        .send({ status: TASK_STATUS.IN_REVIEW, version: 1 });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.status).toBe(TASK_STATUS.IN_REVIEW);
      expect(reviewRes.body.data.__v).toBe(2);
    });

    it('Employee cannot mark task DONE (403 Forbidden)', async () => {
      const task = await Task.create({
        title: 'Review Task',
        projectId: projectAlphaId,
        teamId: teamAlphaId,
        assigneeId: elenaId,
        status: TASK_STATUS.IN_REVIEW,
        priority: TASK_PRIORITY.MEDIUM,
        dueDate: new Date(),
        createdBy: elenaId,
        __v: 0,
      });

      const res = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Cookie', [employeeElenaCookie])
        .send({ status: TASK_STATUS.DONE, version: 0 });

      expect(res.status).toBe(403);
    });

    it('Manager can approve task in IN_REVIEW -> DONE (Terminal)', async () => {
      const task = await Task.create({
        title: 'Ready for Approval',
        projectId: projectAlphaId,
        teamId: teamAlphaId,
        assigneeId: elenaId,
        status: TASK_STATUS.IN_REVIEW,
        priority: TASK_PRIORITY.MEDIUM,
        dueDate: new Date(),
        createdBy: elenaId,
        __v: 0,
      });

      const res = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Cookie', [managerAlphaCookie])
        .send({ status: TASK_STATUS.DONE, version: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TASK_STATUS.DONE);
      expect(res.body.data.completedAt).toBeDefined();

      // Attempt to reopen completed task must fail (Terminal state)
      const reopenRes = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Cookie', [managerAlphaCookie])
        .send({ status: TASK_STATUS.IN_PROGRESS, version: 1 });

      expect(reopenRes.status).toBe(400);
      expect(reopenRes.body.error.message).toContain('terminal');
    });

    it('Manager review rejection requires mandatory reason (min 5 chars)', async () => {
      const task = await Task.create({
        title: 'Needs Work',
        projectId: projectAlphaId,
        teamId: teamAlphaId,
        assigneeId: elenaId,
        status: TASK_STATUS.IN_REVIEW,
        priority: TASK_PRIORITY.MEDIUM,
        dueDate: new Date(),
        createdBy: elenaId,
        __v: 0,
      });

      // Reject without reason
      const noReasonRes = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Cookie', [managerAlphaCookie])
        .send({ status: TASK_STATUS.IN_PROGRESS, version: 0 });

      expect(noReasonRes.status).toBe(400);

      // Reject with short reason
      const shortReasonRes = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Cookie', [managerAlphaCookie])
        .send({ status: TASK_STATUS.IN_PROGRESS, version: 0, rejectionReason: 'No' });

      expect(shortReasonRes.status).toBe(400);

      // Reject with valid reason
      const validRejectRes = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Cookie', [managerAlphaCookie])
        .send({
          status: TASK_STATUS.IN_PROGRESS,
          version: 0,
          rejectionReason: 'Unit tests are failing in CI pipeline',
        });

      expect(validRejectRes.status).toBe(200);
      expect(validRejectRes.body.data.status).toBe(TASK_STATUS.IN_PROGRESS);

      // Activity record has REVIEW_REJECTED action with reason
      const rejectionActivity = await Activity.findOne({
        taskId: task._id,
        action: ACTIVITY_ACTION.REVIEW_REJECTED,
      });
      expect(rejectionActivity).toBeDefined();
      expect(rejectionActivity?.reason).toBe('Unit tests are failing in CI pipeline');
    });

    it('Optimistic Concurrency Control (OCC) detects concurrent update and returns 409 Conflict', async () => {
      const task = await Task.create({
        title: 'Concurrent Task',
        projectId: projectAlphaId,
        teamId: teamAlphaId,
        assigneeId: elenaId,
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.MEDIUM,
        dueDate: new Date(),
        createdBy: elenaId,
        __v: 0,
      });

      // First update succeeds
      const firstRes = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Cookie', [employeeElenaCookie])
        .send({ status: TASK_STATUS.IN_PROGRESS, version: 0 });

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.data.__v).toBe(1);

      // Second update uses stale version 0
      const staleRes = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Cookie', [employeeElenaCookie])
        .send({ status: TASK_STATUS.IN_REVIEW, version: 0 });

      expect(staleRes.status).toBe(409);
      expect(staleRes.body.error.code).toBe('CONFLICT');
    });

    it('Archived project locks child tasks from mutations and transitions', async () => {
      const archivedProject = await Project.create({
        name: 'Archived Project',
        client: 'Old Client',
        startDate: new Date(),
        endDate: new Date(),
        teamId: teamAlphaId,
        status: PROJECT_STATUS.ARCHIVED,
        createdBy: elenaId,
      });

      const task = await Task.create({
        title: 'Frozen Task',
        projectId: archivedProject._id,
        teamId: teamAlphaId,
        assigneeId: elenaId,
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.MEDIUM,
        dueDate: new Date(),
        createdBy: elenaId,
        __v: 0,
      });

      const res = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Cookie', [employeeElenaCookie])
        .send({ status: TASK_STATUS.IN_PROGRESS, version: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('archived');
    });
  });
});
