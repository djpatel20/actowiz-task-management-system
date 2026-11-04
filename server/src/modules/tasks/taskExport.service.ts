import { Response } from 'express';
import { FilterQuery, Types } from 'mongoose';
import { stringify } from 'csv-stringify';
import { Task, ITaskDocument } from './task.model.js';
import { Project } from '../projects/project.model.js';
import { Team } from '../teams/team.model.js';
import { AuthUserPayload } from '../../shared/types/index.js';
import { sanitizeCsvCell } from '../../utils/csvSanitizer.js';
import { TASK_STATUS, TaskPriority, TaskStatus, USER_ROLES } from '../../config/constants.js';

export class TaskExportService {
  static async exportTasksCsv(
    res: Response,
    actor: AuthUserPayload,
    query: {
      projectId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      overdue?: boolean;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<void> {
    const filter: FilterQuery<ITaskDocument> = {};

    // 1. Role-based scoping
    if (actor.role === USER_ROLES.EMPLOYEE) {
      filter.assigneeId = actor._id;
    } else if (actor.role === USER_ROLES.MANAGER) {
      const managedTeams = await Team.find({ managerId: actor._id }).select('_id');
      const teamIds = managedTeams.map((t) => t._id);
      if (actor.teamId) {
        teamIds.push(new Types.ObjectId(actor.teamId));
      }

      const managedProjects = await Project.find({
        $or: [
          { managerId: actor._id },
          { teamId: { $in: teamIds }, managerId: { $exists: false } },
          { teamId: { $in: teamIds }, managerId: null },
        ],
      }).select('_id');

      const managedProjectIds = managedProjects.map((p) => p._id);
      filter.projectId = { $in: managedProjectIds };

      if (query.assigneeId) {
        filter.assigneeId = new Types.ObjectId(query.assigneeId);
      }
    } else if (actor.role === USER_ROLES.ADMIN) {
      if (query.assigneeId) {
        filter.assigneeId = new Types.ObjectId(query.assigneeId);
      }
    }

    // 2. Query filters
    if (query.projectId) {
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
    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      filter.createdAt = dateFilter;
    }

    const tasks = await Task.find(filter)
      .populate('projectId', 'name client')
      .populate('teamId', 'name')
      .populate('assigneeId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tasks-export-${timestamp}.csv"`);

    const stringifier = stringify({
      header: true,
      columns: [
        'Title',
        'Project',
        'Client',
        'Team',
        'Assignee',
        'Priority',
        'Status',
        'Due Date',
        'Created At',
        'Completed At',
      ],
    });

    stringifier.pipe(res);

    for (const task of tasks) {
      const project = task.projectId as unknown as { name?: string; client?: string };
      const team = task.teamId as unknown as { name?: string };
      const assignee = task.assigneeId as unknown as { name?: string; email?: string };

      stringifier.write([
        sanitizeCsvCell(task.title),
        sanitizeCsvCell(project?.name || 'N/A'),
        sanitizeCsvCell(project?.client || 'N/A'),
        sanitizeCsvCell(team?.name || 'N/A'),
        sanitizeCsvCell(assignee ? `${assignee.name} (${assignee.email})` : 'Unassigned'),
        sanitizeCsvCell(task.priority),
        sanitizeCsvCell(task.status),
        sanitizeCsvCell(task.dueDate ? new Date(task.dueDate).toISOString() : ''),
        sanitizeCsvCell(task.createdAt ? new Date(task.createdAt).toISOString() : ''),
        sanitizeCsvCell(task.completedAt ? new Date(task.completedAt).toISOString() : ''),
      ]);
    }

    stringifier.end();
  }
}
