import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { FilterQuery, Types } from 'mongoose';
import { Task, ITaskDocument, IAttachment } from './task.model.js';
import { Project } from '../projects/project.model.js';
import { Team } from '../teams/team.model.js';
import { User } from '../users/user.model.js';
import { Comment } from '../comments/comment.model.js';
import { Activity } from '../activity/activity.model.js';
import { ActivityService } from '../activity/activity.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { validateFileBuffer } from '../../utils/fileValidator.js';
import { socketEmitter } from '../../socket/socketEmitter.js';
import { AuthUserPayload } from '../../shared/types/index.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/AppError.js';
import {
  ACTIVITY_ACTION,
  NOTIFICATION_TYPE,
  PROJECT_STATUS,
  TASK_PRIORITY,
  TASK_STATUS,
  TaskPriority,
  TaskStatus,
  USER_ROLES,
} from '../../config/constants.js';

export class TaskService {
  static async listTasks(
    actor: AuthUserPayload,
    query: {
      page?: number;
      limit?: number;
      projectId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      overdue?: boolean;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<ITaskDocument> = {};

    // 1. Role-based scoping
    if (actor.role === USER_ROLES.EMPLOYEE) {
      filter.assigneeId = actor._id;
    } else if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId) {
        return { tasks: [], total: 0, page: 1, limit, totalPages: 0 };
      }

      // Filter only tasks from projects where this manager is added as manager
      const managedProjects = await Project.find({
        $or: [
          { managerId: actor._id },
          { teamId: actor.teamId, managerId: { $exists: false } },
          { teamId: actor.teamId, managerId: null },
        ],
      }).select('_id');

      const managedProjectIds = managedProjects.map((p) => p._id);
      filter.projectId = { $in: managedProjectIds };

      if (query.projectId) {
        const reqProjectId = new Types.ObjectId(query.projectId);
        if (!managedProjectIds.some((pId) => pId.equals(reqProjectId))) {
          return { tasks: [], total: 0, page: 1, limit, totalPages: 0 };
        }
        filter.projectId = reqProjectId;
      }

      if (query.assigneeId) {
        filter.assigneeId = new Types.ObjectId(query.assigneeId);
      }
    } else if (actor.role === USER_ROLES.ADMIN) {
      if (query.assigneeId) {
        filter.assigneeId = new Types.ObjectId(query.assigneeId);
      }
    }

    // 2. Query filters
    if (query.projectId && actor.role !== USER_ROLES.MANAGER) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.priority) {
      filter.priority = query.priority;
    }
    if (query.overdue) {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: TASK_STATUS.DONE };
    }
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('projectId', 'name client status managerId')
        .populate('teamId', 'name')
        .populate('assigneeId', 'name email role')
        .populate('createdBy', 'name email')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter),
    ]);

    return {
      tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getTaskById(taskId: string, actor: AuthUserPayload) {
    const task = await Task.findById(taskId)
      .populate('projectId', 'name client status managerId')
      .populate('teamId', 'name')
      .populate('assigneeId', 'name email role')
      .populate('createdBy', 'name email')
      .lean();

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // RBAC IDOR check
    if (actor.role === USER_ROLES.MANAGER) {
      const pTeamId = (task.teamId as { _id?: Types.ObjectId } | null)?._id || task.teamId;
      if (!actor.teamId || pTeamId.toString() !== actor.teamId.toString()) {
        throw new NotFoundError('Task not found');
      }

      const pObj = task.projectId as { managerId?: Types.ObjectId | string } | null;
      const isProjectManager =
        (pObj?.managerId && pObj.managerId.toString() === actor._id.toString()) ||
        (!pObj?.managerId && pTeamId.toString() === actor.teamId.toString());

      if (!isProjectManager || (pObj?.managerId && pObj.managerId.toString() !== actor._id.toString())) {
        throw new NotFoundError('Task not found');
      }
    } else if (actor.role === USER_ROLES.EMPLOYEE) {
      const aId = (task.assigneeId as { _id?: Types.ObjectId } | null)?._id || task.assigneeId;
      if (aId.toString() !== actor._id.toString()) {
        throw new NotFoundError('Task not found');
      }
    }

    return task;
  }

  static async createTask(
    data: {
      title: string;
      description?: string;
      projectId: string;
      teamId: string;
      assigneeId: string;
      priority?: TaskPriority;
      dueDate: string;
    },
    actor: AuthUserPayload
  ) {
    if (actor.role === USER_ROLES.EMPLOYEE) {
      throw new ForbiddenError('Employees are not authorized to create tasks');
    }

    const project = await Project.findById(data.projectId);
    if (!project) {
      throw new BadRequestError('Specified project does not exist');
    }

    if (project.status === PROJECT_STATUS.ARCHIVED) {
      throw new BadRequestError('Cannot create tasks in an archived project');
    }

    if (project.teamId.toString() !== data.teamId) {
      throw new BadRequestError('Task teamId must strictly match project teamId');
    }

    if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId || actor.teamId.toString() !== data.teamId) {
        throw new ForbiddenError('Managers can only create tasks for their own team');
      }

      const isProjectManager =
        project.managerId?.toString() === actor._id.toString() ||
        (!project.managerId && actor.teamId.toString() === data.teamId);

      if (!isProjectManager || (project.managerId && project.managerId.toString() !== actor._id.toString())) {
        throw new ForbiddenError('Managers can only create tasks in projects where they are assigned as manager');
      }
    }

    const assignee = await User.findById(data.assigneeId);
    if (
      !assignee ||
      !assignee.isActive ||
      (assignee.role !== USER_ROLES.EMPLOYEE && assignee.role !== USER_ROLES.MANAGER)
    ) {
      throw new BadRequestError('Assignee must be an active Employee or Manager');
    }

    const team = await Team.findById(data.teamId);
    const isMemberOfTeam =
      (assignee.teamId && assignee.teamId.toString() === data.teamId) ||
      (team?.managerId && team.managerId.toString() === assignee._id.toString());

    if (!isMemberOfTeam) {
      throw new BadRequestError('Assignee must belong to the specified team');
    }

    const task = await Task.create({
      title: data.title,
      description: data.description,
      projectId: project._id,
      teamId: project.teamId,
      assigneeId: assignee._id,
      status: TASK_STATUS.TODO,
      priority: data.priority || TASK_PRIORITY.MEDIUM,
      dueDate: new Date(data.dueDate),
      createdBy: actor._id,
      __v: 0,
    });

    // Record activity
    await ActivityService.logActivity({
      taskId: task._id,
      actorId: actor._id,
      action: ACTIVITY_ACTION.TASK_CREATED,
      newValue: TASK_STATUS.TODO,
    });

    // Notify assignee
    await NotificationService.sendNotification({
      userId: assignee._id,
      type: NOTIFICATION_TYPE.TASK_ASSIGNED,
      title: 'New Task Assigned',
      message: `You have been assigned to task "${task.title}".`,
      link: `/tasks?selected=${task._id.toString()}`,
    });

    socketEmitter.toUser(assignee._id, 'task:assigned', {
      taskId: task._id.toString(),
      assigneeId: assignee._id.toString(),
      assignedBy: actor._id.toString(),
    });

    return task;
  }

  static async updateTask(
    taskId: string,
    data: {
      title?: string;
      description?: string;
      priority?: TaskPriority;
      dueDate?: string;
      assigneeId?: string;
    },
    actor: AuthUserPayload
  ) {
    if (actor.role === USER_ROLES.EMPLOYEE) {
      throw new ForbiddenError('Employees are not permitted to edit task details');
    }

    const task = await Task.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const project = await Project.findById(task.projectId);
    if (!project || project.status === PROJECT_STATUS.ARCHIVED) {
      throw new BadRequestError('Cannot edit tasks belonging to an archived project');
    }

    if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId || task.teamId.toString() !== actor.teamId.toString()) {
        throw new NotFoundError('Task not found');
      }

      const isProjectManager =
        project.managerId?.toString() === actor._id.toString() ||
        (!project.managerId && task.teamId.toString() === actor.teamId.toString());

      if (!isProjectManager || (project.managerId && project.managerId.toString() !== actor._id.toString())) {
        throw new ForbiddenError('Managers can only manage and assign tasks in projects where they are assigned as manager');
      }
    }

    let reassigned = false;
    let oldAssigneeId: Types.ObjectId | null = null;

    if (data.assigneeId && data.assigneeId !== task.assigneeId.toString()) {
      const newAssignee = await User.findById(data.assigneeId);
      if (
        !newAssignee ||
        !newAssignee.isActive ||
        (newAssignee.role !== USER_ROLES.EMPLOYEE && newAssignee.role !== USER_ROLES.MANAGER)
      ) {
        throw new BadRequestError('Assignee must be an active Employee or Manager');
      }

      const taskTeam = await Team.findById(task.teamId);
      const isMemberOfTeam =
        (newAssignee.teamId && newAssignee.teamId.toString() === task.teamId.toString()) ||
        (taskTeam?.managerId && taskTeam.managerId.toString() === newAssignee._id.toString());

      if (!isMemberOfTeam) {
        throw new BadRequestError('Assignee must belong to the task team');
      }

      oldAssigneeId = task.assigneeId;
      task.assigneeId = newAssignee._id;
      reassigned = true;
    }

    if (data.title) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.priority) task.priority = data.priority;
    if (data.dueDate) task.dueDate = new Date(data.dueDate);

    await task.save();

    if (reassigned && task.assigneeId) {
      await ActivityService.logActivity({
        taskId: task._id,
        actorId: actor._id,
        action: ACTIVITY_ACTION.TASK_REASSIGNED,
        oldValue: oldAssigneeId ? oldAssigneeId.toString() : undefined,
        newValue: task.assigneeId.toString(),
      });

      await NotificationService.sendNotification({
        userId: task.assigneeId,
        type: NOTIFICATION_TYPE.TASK_ASSIGNED,
        title: 'Task Assigned',
        message: `You were assigned to task "${task.title}".`,
        link: `/tasks?selected=${task._id.toString()}`,
      });

      socketEmitter.toUser(task.assigneeId, 'task:assigned', {
        taskId: task._id.toString(),
        assigneeId: task.assigneeId.toString(),
        assignedBy: actor._id.toString(),
      });
    } else {
      await ActivityService.logActivity({
        taskId: task._id,
        actorId: actor._id,
        action: ACTIVITY_ACTION.TASK_UPDATED,
      });
    }

    return task;
  }

  static async deleteTask(taskId: string, actor: AuthUserPayload) {
    if (actor.role === USER_ROLES.EMPLOYEE) {
      throw new ForbiddenError('Employees are not authorized to delete tasks');
    }

    const task = await Task.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.status === PROJECT_STATUS.ARCHIVED) {
      throw new BadRequestError('Cannot delete tasks belonging to an archived project');
    }

    if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId || task.teamId.toString() !== actor.teamId.toString()) {
        throw new NotFoundError('Task not found');
      }

      const isProjectManager =
        project.managerId?.toString() === actor._id.toString() ||
        (!project.managerId && task.teamId.toString() === actor.teamId.toString());

      if (!isProjectManager || (project.managerId && project.managerId.toString() !== actor._id.toString())) {
        throw new ForbiddenError('Managers can only delete tasks in projects where they are assigned as manager');
      }
    }

    // Clean up attachment files from disk
    if (task.attachments && task.attachments.length > 0) {
      for (const att of task.attachments) {
        const filePath = path.resolve(process.cwd(), 'uploads/attachments', att.filename);
        try {
          await fs.unlink(filePath);
        } catch {
          // File may already be deleted
        }
      }
    }

    // Delete associated comments and activities
    await Promise.all([
      Comment.deleteMany({ taskId: task._id }),
      Activity.deleteMany({ taskId: task._id }),
      Task.findByIdAndDelete(task._id),
    ]);

    return { success: true, message: 'Task deleted successfully' };
  }

  static async uploadAttachment(
    taskId: string,
    file: Express.Multer.File | undefined,
    actor: AuthUserPayload
  ): Promise<IAttachment> {
    if (!file) {
      throw new BadRequestError('No file uploaded');
    }

    const task = await Task.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // RBAC IDOR check
    if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId || task.teamId.toString() !== actor.teamId.toString()) {
        throw new NotFoundError('Task not found');
      }
      const project = await Project.findById(task.projectId);
      const isProjectManager =
        project?.managerId?.toString() === actor._id.toString() ||
        (!project?.managerId && task.teamId.toString() === actor.teamId.toString());
      if (!isProjectManager || (project?.managerId && project.managerId.toString() !== actor._id.toString())) {
        throw new NotFoundError('Task not found');
      }
    } else if (actor.role === USER_ROLES.EMPLOYEE) {
      if (task.assigneeId.toString() !== actor._id.toString()) {
        throw new NotFoundError('Task not found');
      }
    }

    const project = await Project.findById(task.projectId);
    if (!project || project.status === PROJECT_STATUS.ARCHIVED) {
      throw new BadRequestError('Cannot upload attachments to tasks belonging to an archived project');
    }

    // Validate binary magic bytes
    const { mime, ext } = await validateFileBuffer(file.buffer, file.mimetype);

    const uploadDir = path.resolve(process.cwd(), 'uploads/attachments');
    await fs.mkdir(uploadDir, { recursive: true });

    const attachmentId = crypto.randomUUID();
    const storageFilename = `${attachmentId}.${ext}`;
    const filePath = path.join(uploadDir, storageFilename);

    await fs.writeFile(filePath, file.buffer);

    const attachment: IAttachment = {
      id: attachmentId,
      filename: storageFilename,
      originalName: file.originalname,
      url: `/api/tasks/${taskId}/attachments/${attachmentId}/download`,
      mimeType: mime,
      size: file.size,
      uploadedBy: actor._id,
      uploadedAt: new Date(),
    };

    task.attachments.push(attachment);
    await task.save();

    await ActivityService.logActivity({
      taskId: task._id,
      actorId: actor._id,
      action: ACTIVITY_ACTION.ATTACHMENT_ADDED,
      details: {
        filename: file.originalname,
        size: file.size,
      },
    });

    return attachment;
  }

  static async listAttachments(taskId: string, actor: AuthUserPayload): Promise<IAttachment[]> {
    const task = await Task.findById(taskId).populate('attachments.uploadedBy', 'name email role');
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId || task.teamId.toString() !== actor.teamId.toString()) {
        throw new NotFoundError('Task not found');
      }
      const project = await Project.findById(task.projectId);
      const isProjectManager =
        project?.managerId?.toString() === actor._id.toString() ||
        (!project?.managerId && task.teamId.toString() === actor.teamId.toString());
      if (!isProjectManager || (project?.managerId && project.managerId.toString() !== actor._id.toString())) {
        throw new NotFoundError('Task not found');
      }
    } else if (actor.role === USER_ROLES.EMPLOYEE) {
      if (task.assigneeId.toString() !== actor._id.toString()) {
        throw new NotFoundError('Task not found');
      }
    }

    return task.attachments;
  }

  static async getAttachmentForDownload(
    taskId: string,
    attachmentId: string,
    actor: AuthUserPayload
  ): Promise<{ filePath: string; originalName: string; mimeType: string }> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId || task.teamId.toString() !== actor.teamId.toString()) {
        throw new NotFoundError('Task not found');
      }
      const project = await Project.findById(task.projectId);
      const isProjectManager =
        project?.managerId?.toString() === actor._id.toString() ||
        (!project?.managerId && task.teamId.toString() === actor.teamId.toString());
      if (!isProjectManager || (project?.managerId && project.managerId.toString() !== actor._id.toString())) {
        throw new NotFoundError('Task not found');
      }
    } else if (actor.role === USER_ROLES.EMPLOYEE) {
      if (task.assigneeId.toString() !== actor._id.toString()) {
        throw new NotFoundError('Task not found');
      }
    }

    const attachment = task.attachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      throw new NotFoundError('Attachment not found');
    }

    const filePath = path.resolve(process.cwd(), 'uploads/attachments', attachment.filename);
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundError('Attachment file missing from storage');
    }

    return {
      filePath,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
    };
  }

  static async deleteAttachment(
    taskId: string,
    attachmentId: string,
    actor: AuthUserPayload
  ): Promise<void> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId || task.teamId.toString() !== actor.teamId.toString()) {
        throw new NotFoundError('Task not found');
      }
      const project = await Project.findById(task.projectId);
      const isProjectManager =
        project?.managerId?.toString() === actor._id.toString() ||
        (!project?.managerId && task.teamId.toString() === actor.teamId.toString());
      if (!isProjectManager || (project?.managerId && project.managerId.toString() !== actor._id.toString())) {
        throw new NotFoundError('Task not found');
      }
    } else if (actor.role === USER_ROLES.EMPLOYEE) {
      if (task.assigneeId.toString() !== actor._id.toString()) {
        throw new NotFoundError('Task not found');
      }
    }

    const project = await Project.findById(task.projectId);
    if (!project || project.status === PROJECT_STATUS.ARCHIVED) {
      throw new BadRequestError('Cannot delete attachments belonging to an archived project');
    }

    const attachmentIndex = task.attachments.findIndex((a) => a.id === attachmentId);
    if (attachmentIndex === -1) {
      throw new NotFoundError('Attachment not found');
    }

    const attachment = task.attachments[attachmentIndex];

    // Employees can only delete files they personally uploaded
    if (actor.role === USER_ROLES.EMPLOYEE) {
      if (attachment.uploadedBy.toString() !== actor._id.toString()) {
        throw new ForbiddenError('You can only delete attachments that you personally uploaded');
      }
    }

    // Remove from array and disk
    task.attachments.splice(attachmentIndex, 1);
    await task.save();

    const filePath = path.resolve(process.cwd(), 'uploads/attachments', attachment.filename);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may already have been removed, continue
    }

    await ActivityService.logActivity({
      taskId: task._id,
      actorId: actor._id,
      action: ACTIVITY_ACTION.ATTACHMENT_DELETED,
      details: {
        filename: attachment.originalName,
      },
    });
  }
}
