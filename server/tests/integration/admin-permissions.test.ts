import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { initTestDatabase, closeTestDatabase, clearTestDatabase } from '../setup.js';
import { User } from '../../src/modules/users/user.model.js';
import { Team } from '../../src/modules/teams/team.model.js';
import { Project } from '../../src/modules/projects/project.model.js';
import { Task } from '../../src/modules/tasks/task.model.js';
import {
  USER_ROLES,
  TASK_STATUS,
  TASK_PRIORITY,
  PROJECT_STATUS,
} from '../../src/config/constants.js';
import { generateAccessToken } from '../../src/utils/tokens.js';

describe('Admin & Manager Scoped Permissions Integration Tests', () => {
  const app = createApp();

  let adminCookie: string;
  let managerCookie: string;
  let otherManagerCookie: string;
  let employeeCookie: string;

  let adminId: string;
  let teamId: string;
  let managerId: string;
  let otherManagerId: string;
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

    const team = await Team.create({ name: 'Delta Force' });
    teamId = team._id.toString();

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@actowiz.com',
      passwordHash: pass,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    adminId = admin._id.toString();

    const manager = await User.create({
      name: 'Manager Delta',
      email: 'manager.delta@actowiz.com',
      passwordHash: pass,
      role: USER_ROLES.MANAGER,
      teamId: team._id,
      isActive: true,
    });
    managerId = manager._id.toString();

    const otherManager = await User.create({
      name: 'Manager Other',
      email: 'manager.other@actowiz.com',
      passwordHash: pass,
      role: USER_ROLES.MANAGER,
      teamId: team._id,
      isActive: true,
    });
    otherManagerId = otherManager._id.toString();

    team.managerId = manager._id;
    await team.save();

    const employee = await User.create({
      name: 'Employee Delta',
      email: 'employee.delta@actowiz.com',
      passwordHash: pass,
      role: USER_ROLES.EMPLOYEE,
      teamId: team._id,
      isActive: true,
    });
    employeeId = employee._id.toString();

    const adminToken = generateAccessToken({
      userId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      teamId: null,
    });
    const managerToken = generateAccessToken({
      userId: manager._id.toString(),
      email: manager.email,
      role: manager.role,
      teamId: team._id.toString(),
    });
    const otherManagerToken = generateAccessToken({
      userId: otherManager._id.toString(),
      email: otherManager.email,
      role: otherManager.role,
      teamId: team._id.toString(),
    });
    const employeeToken = generateAccessToken({
      userId: employee._id.toString(),
      email: employee.email,
      role: employee.role,
      teamId: team._id.toString(),
    });

    adminCookie = `access_token=${adminToken}`;
    managerCookie = `access_token=${managerToken}`;
    otherManagerCookie = `access_token=${otherManagerToken}`;
    employeeCookie = `access_token=${employeeToken}`;
  });

  describe('1. Teams: Create and Delete Team', () => {
    it('Admin can create a new team and delete an existing team', async () => {
      // Create team
      const createRes = await request(app)
        .post('/api/teams')
        .set('Cookie', [adminCookie])
        .send({
          name: 'Echo Team',
          description: 'Special operations',
        });
      expect(createRes.status).toBe(201);
      const newTeamId = createRes.body.data._id;

      // Delete team
      const deleteRes = await request(app)
        .delete(`/api/teams/${newTeamId}`)
        .set('Cookie', [adminCookie]);
      expect(deleteRes.status).toBe(200);

      // Verify deletion
      const findRes = await Team.findById(newTeamId);
      expect(findRes).toBeNull();
    });

    it('Non-admin cannot delete team (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/teams/${teamId}`)
        .set('Cookie', [managerCookie]);
      expect(res.status).toBe(403);
    });
  });

  describe('2. Project: Create with Team & Assigned Manager, and Delete Project', () => {
    it('Admin can create project assigning both team and manager', async () => {
      const start = new Date().toISOString();
      const end = new Date(Date.now() + 86400000 * 30).toISOString();

      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', [adminCookie])
        .send({
          name: 'Delta Core Project',
          client: 'Acme Corp',
          startDate: start,
          endDate: end,
          teamId,
          managerId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.teamId).toBe(teamId);
      expect(res.body.data.managerId).toBe(managerId);

      const projectId = res.body.data._id;

      // Admin can delete project
      const deleteRes = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Cookie', [adminCookie]);
      expect(deleteRes.status).toBe(200);

      const findProject = await Project.findById(projectId);
      expect(findProject).toBeNull();
    });

    it('Admin can edit project info: deadlines, manager, client, description, and status', async () => {
      const project = await Project.create({
        name: 'Original Project',
        client: 'Original Client',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        teamId,
        managerId,
        createdBy: adminId,
      });

      const newStartDate = new Date(Date.now() + 86400000 * 2).toISOString();
      const newEndDate = new Date(Date.now() + 86400000 * 60).toISOString();

      const patchRes = await request(app)
        .patch(`/api/projects/${project._id}`)
        .set('Cookie', [adminCookie])
        .send({
          name: 'Updated Project Name',
          client: 'Updated Client Organization',
          description: 'Updated Scope and Roadmap',
          startDate: newStartDate,
          endDate: newEndDate,
          managerId: otherManagerId,
          status: PROJECT_STATUS.ARCHIVED,
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.name).toBe('Updated Project Name');
      expect(patchRes.body.data.client).toBe('Updated Client Organization');
      expect(patchRes.body.data.description).toBe('Updated Scope and Roadmap');
      expect(patchRes.body.data.status).toBe(PROJECT_STATUS.ARCHIVED);
    });

    it('Non-admin cannot delete project (403 Forbidden)', async () => {
      const project = await Project.create({
        name: 'Protected Project',
        client: 'Client A',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        teamId,
        createdBy: managerId,
      });

      const res = await request(app)
        .delete(`/api/projects/${project._id}`)
        .set('Cookie', [managerCookie]);
      expect(res.status).toBe(403);
    });
  });

  describe('3. Task: Assign to Manager and Employee both', () => {
    it('Task can be assigned to an active Manager or an active Employee of that team', async () => {
      const project = await Project.create({
        name: 'Sprint Project',
        client: 'Client Alpha',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        teamId,
        managerId,
        createdBy: managerId,
      });

      // 1. Assign to Employee
      const taskEmployeeRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', [adminCookie])
        .send({
          title: 'Employee Task',
          projectId: project._id.toString(),
          teamId,
          assigneeId: employeeId,
          priority: TASK_PRIORITY.HIGH,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });
      expect(taskEmployeeRes.status).toBe(201);
      expect(taskEmployeeRes.body.data.assigneeId).toBe(employeeId);

      // 2. Assign to Manager
      const taskManagerRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', [adminCookie])
        .send({
          title: 'Manager Review Task',
          projectId: project._id.toString(),
          teamId,
          assigneeId: managerId,
          priority: TASK_PRIORITY.MEDIUM,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });
      expect(taskManagerRes.status).toBe(201);
      expect(taskManagerRes.body.data.assigneeId).toBe(managerId);

      // 3. Team members query returns both Manager and Employee
      const membersRes = await request(app)
        .get(`/api/teams/${teamId}/members`)
        .set('Cookie', [adminCookie]);
      expect(membersRes.status).toBe(200);
      const memberRoles = membersRes.body.data.map((m: { role: string }) => m.role);
      expect(memberRoles).toContain(USER_ROLES.MANAGER);
      expect(memberRoles).toContain(USER_ROLES.EMPLOYEE);
    });
  });

  describe('4. Manager Scope: Manage tasks ONLY in project added as manager', () => {
    it('Manager can create, assign, and delete tasks in project where added as manager', async () => {
      const project = await Project.create({
        name: 'Assigned Project',
        client: 'Client One',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        teamId,
        managerId, // Manager Delta is added as manager
        createdBy: managerId,
      });

      // Manager Delta creates task
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', [managerCookie])
        .send({
          title: 'Assigned Project Task',
          projectId: project._id.toString(),
          teamId,
          assigneeId: employeeId,
          priority: TASK_PRIORITY.HIGH,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });
      expect(createRes.status).toBe(201);
      const taskId = createRes.body.data._id;

      // Manager Delta can reassign/update task
      const updateRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Cookie', [managerCookie])
        .send({
          title: 'Updated Assigned Task Title',
        });
      expect(updateRes.status).toBe(200);

      // Manager Delta can delete task
      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Cookie', [managerCookie]);
      expect(deleteRes.status).toBe(200);

      const findTask = await Task.findById(taskId);
      expect(findTask).toBeNull();
    });

    it('Manager CANNOT create, update, or delete tasks in a project where another manager is assigned', async () => {
      const otherProject = await Project.create({
        name: 'Other Manager Project',
        client: 'Client Two',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        teamId,
        managerId: otherManagerId, // otherManager is the assigned manager
        createdBy: otherManagerId,
      });

      // Manager Delta attempts to create task in Other Manager's project -> 403 Forbidden
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', [managerCookie])
        .send({
          title: 'Unauthorized Task Creation',
          projectId: otherProject._id.toString(),
          teamId,
          assigneeId: employeeId,
          priority: TASK_PRIORITY.MEDIUM,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });
      expect(createRes.status).toBe(403);

      // Create a task as admin in otherProject
      const task = await Task.create({
        title: 'Task In Other Project',
        projectId: otherProject._id,
        teamId,
        assigneeId: employeeId,
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.LOW,
        dueDate: new Date(Date.now() + 86400000),
        createdBy: otherManagerId,
        __v: 0,
      });

      // Manager Delta attempts to update/reassign task -> 403 Forbidden
      const updateRes = await request(app)
        .patch(`/api/tasks/${task._id}`)
        .set('Cookie', [managerCookie])
        .send({ title: 'Hacked Title' });
      expect(updateRes.status).toBe(403);

      // Manager Delta attempts to delete task -> 403 Forbidden
      const deleteRes = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Cookie', [managerCookie]);
      expect(deleteRes.status).toBe(403);
    });
  });

  describe('5. User Roles: Admin assigns user roles', () => {
    it('Admin can update user role from EMPLOYEE to MANAGER with team assignment', async () => {
      const updateRes = await request(app)
        .patch(`/api/users/${employeeId}`)
        .set('Cookie', [adminCookie])
        .send({
          role: USER_ROLES.MANAGER,
          teamId,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.role).toBe(USER_ROLES.MANAGER);

      const userInDb = await User.findById(employeeId);
      expect(userInDb?.role).toBe(USER_ROLES.MANAGER);
    });

    it('Admin CANNOT change their own role (self role assignment blocked)', async () => {
      const selfRes = await request(app)
        .patch(`/api/users/${adminId}`)
        .set('Cookie', [adminCookie])
        .send({
          role: USER_ROLES.EMPLOYEE,
          teamId,
        });

      expect(selfRes.status).toBe(403);
      expect(selfRes.body.error.message).toMatch(/cannot change their own role/i);

      const adminInDb = await User.findById(adminId);
      expect(adminInDb?.role).toBe(USER_ROLES.ADMIN);
    });
  });
});
