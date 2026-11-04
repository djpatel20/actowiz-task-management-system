import { FilterQuery, Types } from 'mongoose';
import { Team, ITeamDocument } from './team.model.js';
import { User } from '../users/user.model.js';
import { Project } from '../projects/project.model.js';
import { Task } from '../tasks/task.model.js';
import { Activity } from '../activity/activity.model.js';
import { AuthUserPayload } from '../../shared/types/index.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/AppError.js';
import { USER_ROLES } from '../../config/constants.js';

export class TeamService {
  static async listTeams(
    actor: AuthUserPayload,
    query: { page?: number; limit?: number; search?: string }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<ITeamDocument> = {};

    if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId) {
        return { teams: [], total: 0, page: 1, limit, totalPages: 0 };
      }
      filter._id = actor.teamId;
    }

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    const [teams, total] = await Promise.all([
      Team.find(filter)
        .populate('managerId', 'name email role')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Team.countDocuments(filter),
    ]);

    // Attach project and employee counts
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const [projectCount, memberCount] = await Promise.all([
          Project.countDocuments({ teamId: team._id }),
          User.countDocuments({ teamId: team._id, role: USER_ROLES.EMPLOYEE, isActive: true }),
        ]);
        return {
          ...team,
          projectCount,
          memberCount,
        };
      })
    );

    return {
      teams: teamsWithCounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getTeamById(teamId: string, actor: AuthUserPayload) {
    if (actor.role !== USER_ROLES.ADMIN) {
      if (!actor.teamId || actor.teamId.toString() !== teamId) {
        throw new NotFoundError('Team not found');
      }
    }

    const team = await Team.findById(teamId).populate('managerId', 'name email role').lean();
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const [projectCount, memberCount] = await Promise.all([
      Project.countDocuments({ teamId: team._id }),
      User.countDocuments({ teamId: team._id, role: USER_ROLES.EMPLOYEE, isActive: true }),
    ]);

    return {
      ...team,
      projectCount,
      memberCount,
    };
  }

  static async createTeam(data: { name: string; description?: string; managerId?: string }) {
    const existing = await Team.findOne({ name: data.name });
    if (existing) {
      throw new ConflictError('A team with this name already exists');
    }

    let managerObjectId: Types.ObjectId | null = null;
    if (data.managerId) {
      const manager = await User.findById(data.managerId);
      if (!manager || !manager.isActive || manager.role !== USER_ROLES.MANAGER) {
        throw new BadRequestError('Specified manager must be an active user with MANAGER role');
      }

      const managingTeam = await Team.findOne({ managerId: manager._id });
      if (managingTeam) {
        throw new ConflictError('This manager is already assigned to manage another team');
      }
      managerObjectId = manager._id;
    }

    const team = await Team.create({
      name: data.name,
      description: data.description,
      managerId: managerObjectId,
    });

    if (managerObjectId) {
      await User.findByIdAndUpdate(managerObjectId, { teamId: team._id });
    }

    return team;
  }

  static async updateTeam(
    teamId: string,
    data: { name?: string; description?: string; managerId?: string | null }
  ) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    if (data.name && data.name !== team.name) {
      const existing = await Team.findOne({ name: data.name });
      if (existing) {
        throw new ConflictError('A team with this name already exists');
      }
      team.name = data.name;
    }

    if (data.description !== undefined) {
      team.description = data.description;
    }

    if (data.managerId !== undefined) {
      if (data.managerId === null) {
        // Remove manager
        if (team.managerId) {
          await User.findByIdAndUpdate(team.managerId, { teamId: null });
        }
        team.managerId = undefined;
      } else {
        const newManager = await User.findById(data.managerId);
        if (!newManager || !newManager.isActive || newManager.role !== USER_ROLES.MANAGER) {
          throw new BadRequestError('Specified manager must be an active user with MANAGER role');
        }

        const existingManagedTeam = await Team.findOne({
          managerId: newManager._id,
          _id: { $ne: team._id },
        });
        if (existingManagedTeam) {
          throw new ConflictError('This manager is already assigned to manage another team');
        }

        if (team.managerId && team.managerId.toString() !== data.managerId) {
          await User.findByIdAndUpdate(team.managerId, { teamId: null });
        }

        team.managerId = newManager._id;
        await User.findByIdAndUpdate(newManager._id, { teamId: team._id });
      }
    }

    await team.save();
    return team;
  }

  static async deleteTeam(teamId: string, actor: AuthUserPayload) {
    if (actor.role !== USER_ROLES.ADMIN) {
      throw new ForbiddenError('Only Admins are permitted to delete teams');
    }

    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Unassign users who belonged to this team
    await User.updateMany({ teamId: team._id }, { $unset: { teamId: 1 } });

    // Find all projects in this team
    const projects = await Project.find({ teamId: team._id });
    const projectIds = projects.map((p) => p._id);

    // Find tasks in this team
    const tasks = await Task.find({ teamId: team._id });
    const taskIds = tasks.map((t) => t._id);

    if (taskIds.length > 0) {
      await Activity.deleteMany({ taskId: { $in: taskIds } });
      await Task.deleteMany({ _id: { $in: taskIds } });
    }

    if (projectIds.length > 0) {
      await Project.deleteMany({ _id: { $in: projectIds } });
    }

    await Team.findByIdAndDelete(team._id);
    return { success: true, message: 'Team and associated resources deleted successfully' };
  }

  static async getTeamMembers(teamId: string, actor: AuthUserPayload) {
    if (actor.role !== USER_ROLES.ADMIN) {
      if (!actor.teamId || actor.teamId.toString() !== teamId) {
        throw new NotFoundError('Team not found');
      }
    }

    const team = await Team.findById(teamId).lean();
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const managerFilter = team.managerId ? [{ _id: team.managerId }] : [];

    // Fetch both Employees and Managers who belong to or lead this team
    const members = await User.find({
      $or: [
        { teamId: new Types.ObjectId(teamId) },
        ...managerFilter,
      ],
      role: { $in: [USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER] },
      isActive: true,
    })
      .select('name email role teamId isActive')
      .sort({ role: 1, name: 1 })
      .lean();

    return members;
  }
}
