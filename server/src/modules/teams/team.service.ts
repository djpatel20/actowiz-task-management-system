import { FilterQuery, Types } from 'mongoose';
import { Team, ITeamDocument } from './team.model.js';
import { User } from '../users/user.model.js';
import { Project } from '../projects/project.model.js';
import { AuthUserPayload } from '../../shared/types/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
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

  static async getTeamMembers(teamId: string, actor: AuthUserPayload) {
    if (actor.role !== USER_ROLES.ADMIN) {
      if (!actor.teamId || actor.teamId.toString() !== teamId) {
        throw new NotFoundError('Team not found');
      }
    }

    const members = await User.find({
      teamId: new Types.ObjectId(teamId),
      role: USER_ROLES.EMPLOYEE,
      isActive: true,
    })
      .select('name email role teamId isActive')
      .lean();

    return members;
  }
}
