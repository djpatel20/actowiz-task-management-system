import { FilterQuery, Types } from 'mongoose';
import { Project, IProjectDocument } from './project.model.js';
import { Task } from '../tasks/task.model.js';
import { Team } from '../teams/team.model.js';
import { User } from '../users/user.model.js';
import { Activity } from '../activity/activity.model.js';
import { AuthUserPayload } from '../../shared/types/index.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/AppError.js';
import { PROJECT_STATUS, ProjectStatus, TASK_STATUS, USER_ROLES } from '../../config/constants.js';

export class ProjectService {
  static async calculateProgress(projectId: Types.ObjectId): Promise<{
    progressPercentage: number;
    totalTasks: number;
    completedTasks: number;
  }> {
    const [totalTasks, completedTasks] = await Promise.all([
      Task.countDocuments({ projectId }),
      Task.countDocuments({ projectId, status: TASK_STATUS.DONE }),
    ]);

    const progressPercentage =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return { progressPercentage, totalTasks, completedTasks };
  }

  static async listProjects(
    actor: AuthUserPayload,
    query: {
      page?: number;
      limit?: number;
      teamId?: string;
      status?: ProjectStatus;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IProjectDocument> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { client: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Role-based scoping
    if (actor.role === USER_ROLES.ADMIN) {
      if (query.teamId) {
        filter.teamId = new Types.ObjectId(query.teamId);
      }
    } else if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId) {
        return { projects: [], total: 0, page: 1, limit, totalPages: 0 };
      }
      filter.teamId = actor.teamId;
    } else if (actor.role === USER_ROLES.EMPLOYEE) {
      // Find projects where this employee has assigned tasks
      const projectIds = await Task.distinct('projectId', { assigneeId: actor._id });
      filter._id = { $in: projectIds };
    }

    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('teamId', 'name')
        .populate('managerId', 'name email role')
        .populate('createdBy', 'name email')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(filter),
    ]);

    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const stats = await this.calculateProgress(project._id as Types.ObjectId);
        return {
          ...project,
          ...stats,
        };
      })
    );

    return {
      projects: projectsWithProgress,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getProjectById(projectId: string, actor: AuthUserPayload) {
    const project = await Project.findById(projectId)
      .populate('teamId', 'name description')
      .populate('managerId', 'name email role')
      .populate('createdBy', 'name email')
      .lean();

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Authorization check
    if (actor.role === USER_ROLES.MANAGER) {
      const pTeamId = (project.teamId as { _id?: Types.ObjectId } | null)?._id || project.teamId;
      if (!actor.teamId || !pTeamId || pTeamId.toString() !== actor.teamId.toString()) {
        throw new NotFoundError('Project not found');
      }
    } else if (actor.role === USER_ROLES.EMPLOYEE) {
      const hasAssignedTask = await Task.exists({
        projectId: project._id,
        assigneeId: actor._id,
      });
      if (!hasAssignedTask) {
        throw new NotFoundError('Project not found');
      }
    }

    const stats = await this.calculateProgress(project._id as Types.ObjectId);

    return {
      ...project,
      ...stats,
    };
  }

  static async createProject(
    data: {
      name: string;
      description?: string;
      client: string;
      startDate: string;
      endDate: string;
      teamId: string;
      managerId?: string;
    },
    actor: AuthUserPayload
  ) {
    if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId || actor.teamId.toString() !== data.teamId) {
        throw new ForbiddenError('Managers can only create projects for their own team');
      }
    }

    const team = await Team.findById(data.teamId);
    if (!team) {
      throw new BadRequestError('Specified team does not exist');
    }

    let managerObjectId: Types.ObjectId | null = null;
    if (data.managerId) {
      const manager = await User.findById(data.managerId);
      if (!manager || !manager.isActive || manager.role !== USER_ROLES.MANAGER) {
        throw new BadRequestError('Assigned manager must be an active user with MANAGER role');
      }
      managerObjectId = manager._id;
    } else if (team.managerId) {
      managerObjectId = team.managerId;
    }

    const project = await Project.create({
      name: data.name,
      description: data.description,
      client: data.client,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      teamId: team._id,
      managerId: managerObjectId || undefined,
      status: PROJECT_STATUS.ACTIVE,
      createdBy: actor._id,
    });

    return project;
  }

  static async updateProject(
    projectId: string,
    data: {
      name?: string;
      description?: string;
      client?: string;
      startDate?: string;
      endDate?: string;
      status?: ProjectStatus;
      teamId?: string;
      managerId?: string | null;
    },
    actor: AuthUserPayload
  ) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId || project.teamId.toString() !== actor.teamId.toString()) {
        throw new NotFoundError('Project not found');
      }
    }

    if (data.startDate || data.endDate) {
      const effectiveStart = data.startDate ? new Date(data.startDate) : project.startDate;
      const effectiveEnd = data.endDate ? new Date(data.endDate) : project.endDate;
      if (effectiveEnd < effectiveStart) {
        throw new BadRequestError('End date must be greater than or equal to start date');
      }
      if (data.startDate) project.startDate = effectiveStart;
      if (data.endDate) project.endDate = effectiveEnd;
    }

    if (data.name) project.name = data.name;
    if (data.description !== undefined) project.description = data.description;
    if (data.client) project.client = data.client;
    if (data.status) project.status = data.status;

    if (data.teamId && actor.role === USER_ROLES.ADMIN) {
      const team = await Team.findById(data.teamId);
      if (!team) {
        throw new BadRequestError('Specified team does not exist');
      }
      project.teamId = team._id;
      await Task.updateMany({ projectId: project._id }, { teamId: team._id });
    }

    if (data.managerId !== undefined) {
      if (data.managerId === null || data.managerId === '') {
        project.managerId = undefined;
      } else {
        const manager = await User.findById(data.managerId);
        if (!manager || !manager.isActive || manager.role !== USER_ROLES.MANAGER) {
          throw new BadRequestError('Assigned manager must be an active user with MANAGER role');
        }
        project.managerId = manager._id;
      }
    }

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('teamId', 'name description')
      .populate('managerId', 'name email role')
      .populate('createdBy', 'name email');

    return populated || project;
  }

  static async deleteProject(projectId: string, actor: AuthUserPayload) {
    if (actor.role !== USER_ROLES.ADMIN) {
      throw new ForbiddenError('Only Admins are permitted to delete projects');
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Cascade deletion of tasks and activities
    const tasks = await Task.find({ projectId: project._id });
    const taskIds = tasks.map((t) => t._id);

    if (taskIds.length > 0) {
      await Activity.deleteMany({ taskId: { $in: taskIds } });
      await Task.deleteMany({ _id: { $in: taskIds } });
    }

    await Project.findByIdAndDelete(project._id);
    return { success: true, message: 'Project and all associated tasks deleted successfully' };
  }
}
