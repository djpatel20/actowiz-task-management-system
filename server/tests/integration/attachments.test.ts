import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import fs from 'fs/promises';
import path from 'path';
import { createApp } from '../../src/app.js';
import { initTestDatabase, closeTestDatabase, clearTestDatabase } from '../setup.js';
import { User } from '../../src/modules/users/user.model.js';
import { Team } from '../../src/modules/teams/team.model.js';
import { Project } from '../../src/modules/projects/project.model.js';
import { Task } from '../../src/modules/tasks/task.model.js';
import { Activity } from '../../src/modules/activity/activity.model.js';
import { generateAccessToken } from '../../src/utils/tokens.js';
import {
  ACTIVITY_ACTION,
  PROJECT_STATUS,
  TASK_PRIORITY,
  TASK_STATUS,
  USER_ROLES,
} from '../../src/config/constants.js';

describe('Task Attachments & Binary Magic-Bytes RBAC Integration Tests', () => {
  const app = createApp();

  let adminCookie: string;
  let managerAlphaCookie: string;
  let managerBetaCookie: string;
  let employeeElenaCookie: string;
  let employeeDavidCookie: string;

  let teamAlphaId: string;
  let teamBetaId: string;
  let projectAlphaId: string;
  let taskId: string;

  let adminId: string;
  let elenaId: string;
  let davidId: string;

  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
    // Clean up test uploads directory if created
    try {
      await fs.rm(path.resolve(process.cwd(), 'uploads'), { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  beforeEach(async () => {
    await clearTestDatabase();

    const pass = await bcrypt.hash('Secret123!', 10);

    const teamAlpha = await Team.create({ name: 'Alpha Team' });
    const teamBeta = await Team.create({ name: 'Beta Team' });
    teamAlphaId = teamAlpha._id.toString();
    teamBetaId = teamBeta._id.toString();

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@att.com',
      passwordHash: pass,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });
    adminId = admin._id.toString();

    const managerAlpha = await User.create({
      name: 'Manager Alpha',
      email: 'mgr.alpha@att.com',
      passwordHash: pass,
      role: USER_ROLES.MANAGER,
      teamId: teamAlpha._id,
      isActive: true,
    });
    await Team.findByIdAndUpdate(teamAlpha._id, { managerId: managerAlpha._id });

    const managerBeta = await User.create({
      name: 'Manager Beta',
      email: 'mgr.beta@att.com',
      passwordHash: pass,
      role: USER_ROLES.MANAGER,
      teamId: teamBeta._id,
      isActive: true,
    });
    await Team.findByIdAndUpdate(teamBeta._id, { managerId: managerBeta._id });

    const elena = await User.create({
      name: 'Elena Rostova',
      email: 'elena@att.com',
      passwordHash: pass,
      role: USER_ROLES.EMPLOYEE,
      teamId: teamAlpha._id,
      isActive: true,
    });
    elenaId = elena._id.toString();

    const david = await User.create({
      name: 'David Kim',
      email: 'david@att.com',
      passwordHash: pass,
      role: USER_ROLES.EMPLOYEE,
      teamId: teamAlpha._id,
      isActive: true,
    });
    davidId = david._id.toString();

    const now = new Date();
    const project = await Project.create({
      name: 'Alpha Project',
      client: 'Acme',
      startDate: now,
      endDate: new Date(now.getTime() + 10 * 86400000),
      teamId: teamAlpha._id,
      status: PROJECT_STATUS.ACTIVE,
      createdBy: managerAlpha._id,
    });
    projectAlphaId = project._id.toString();

    const task = await Task.create({
      title: 'Attachment Test Task',
      projectId: project._id,
      teamId: teamAlpha._id,
      assigneeId: elena._id,
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.MEDIUM,
      dueDate: new Date(now.getTime() + 86400000),
      createdBy: managerAlpha._id,
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
    managerAlphaCookie = makeCookie(managerAlpha);
    managerBetaCookie = makeCookie(managerBeta);
    employeeElenaCookie = makeCookie(elena);
    employeeDavidCookie = makeCookie(david);
  });

  it('POST /api/tasks/:id/attachments - uploads valid PDF attachment with binary magic-bytes verification', async () => {
    // Valid minimal PDF buffer with '%PDF-1.4' magic header
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF');

    const res = await request(app)
      .post(`/api/tasks/${taskId}/attachments`)
      .set('Cookie', [employeeElenaCookie])
      .attach('file', validPdfBuffer, 'architecture.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.originalName).toBe('architecture.pdf');
    expect(res.body.data.mimeType).toBe('application/pdf');

    // Verify activity logged
    const activity = await Activity.findOne({ taskId, action: ACTIVITY_ACTION.ATTACHMENT_ADDED });
    expect(activity).toBeDefined();
    expect(activity?.details?.filename).toBe('architecture.pdf');
  });

  it('POST /api/tasks/:id/attachments - rejects disguised executable with fake extension (magic-bytes defense)', async () => {
    // Fake PDF containing Windows PE / EXE binary magic bytes 'MZ...'
    const disguisedExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff');

    const res = await request(app)
      .post(`/api/tasks/${taskId}/attachments`)
      .set('Cookie', [employeeElenaCookie])
      .attach('file', disguisedExeBuffer, 'invoice_fake.pdf');

    // Must be rejected by binary magic-bytes validator
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/(Unsupported|Unable to verify|dangerous)/);
  });

  it('DELETE /api/tasks/:id/attachments/:attachmentId - enforces RBAC: employee cannot delete another user attachment', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');

    // Elena uploads an attachment
    const uploadRes = await request(app)
      .post(`/api/tasks/${taskId}/attachments`)
      .set('Cookie', [employeeElenaCookie])
      .attach('file', validPdfBuffer, 'elena-spec.pdf');

    expect(uploadRes.status).toBe(201);
    const attachmentId = uploadRes.body.data.id;

    // David (another employee) attempts to delete Elena's attachment -> 404 (anti-enumeration: task unassigned)
    const davidDeleteRes = await request(app)
      .delete(`/api/tasks/${taskId}/attachments/${attachmentId}`)
      .set('Cookie', [employeeDavidCookie]);

    expect(davidDeleteRes.status).toBe(404);

    // Elena deletes her own uploaded attachment -> 200 OK
    const elenaDeleteRes = await request(app)
      .delete(`/api/tasks/${taskId}/attachments/${attachmentId}`)
      .set('Cookie', [employeeElenaCookie]);

    expect(elenaDeleteRes.status).toBe(200);

    // Verify activity logged
    const deleteActivity = await Activity.findOne({
      taskId,
      action: ACTIVITY_ACTION.ATTACHMENT_DELETED,
    });
    expect(deleteActivity).toBeDefined();
  });

  it('Manager Beta cannot view or download Team Alpha attachments (IDOR prevention returns 404)', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');

    const uploadRes = await request(app)
      .post(`/api/tasks/${taskId}/attachments`)
      .set('Cookie', [employeeElenaCookie])
      .attach('file', validPdfBuffer, 'confidential.pdf');

    const attachmentId = uploadRes.body.data.id;

    // Manager Beta tries to list attachments of Team Alpha task
    const listRes = await request(app)
      .get(`/api/tasks/${taskId}/attachments`)
      .set('Cookie', [managerBetaCookie]);

    expect(listRes.status).toBe(404);

    // Manager Beta tries to download Team Alpha attachment
    const downloadRes = await request(app)
      .get(`/api/tasks/${taskId}/attachments/${attachmentId}/download`)
      .set('Cookie', [managerBetaCookie]);

    expect(downloadRes.status).toBe(404);
  });
});
