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
      const userDoc = await User.findById(actor._id).select('teamId teamIds').lean();
      const managedTeams = await Team.find({
        $or: [
          { managerId: actor._id },
          { managerIds: actor._id },
          { memberIds: actor._id },
        ],
      }).select('_id');

      const teamIds: Types.ObjectId[] = managedTeams.map((t) => t._id);
      if (actor.teamId) {
        teamIds.push(new Types.ObjectId(actor.teamId));
      }
      if (userDoc?.teamId) {
        teamIds.push(userDoc.teamId);
      }
      if (userDoc?.teamIds?.length) {
        teamIds.push(...userDoc.teamIds);
      }

      const uniqueTeamIds = Array.from(new Set(teamIds.map((id) => id.toString()))).map(
        (id) => new Types.ObjectId(id)
      );

      if (uniqueTeamIds.length === 0) {
        return { teams: [], total: 0, page: 1, limit, totalPages: 0 };
      }
      filter._id = { $in: uniqueTeamIds };
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

    // Attach project, manager, and employee counts
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const tObjId = team._id;
        const memberIdList = [
          ...(team.memberIds || []),
          ...(team.managerIds || []),
          ...(team.managerId ? [(team.managerId as { _id?: Types.ObjectId })._id || team.managerId] : []),
        ];

        const [projectCount, teamUsers] = await Promise.all([
          Project.countDocuments({ teamId: tObjId }),
          User.find({
            $or: [
              { teamIds: tObjId },
              { teamId: tObjId },
              { _id: { $in: memberIdList } },
            ],
            isActive: true,
            role: { $in: [USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER] },
          })
            .select('name email role')
            .lean(),
        ]);

        const uniqueUsersMap = new Map<string, (typeof teamUsers)[0]>();
        teamUsers.forEach((u) => uniqueUsersMap.set(u._id.toString(), u as (typeof teamUsers)[0]));
        const allMembers = Array.from(uniqueUsersMap.values());

        const managers = allMembers.filter((u) => u.role === USER_ROLES.MANAGER);
        const employees = allMembers.filter((u) => u.role === USER_ROLES.EMPLOYEE);

        return {
          ...team,
          managers,
          managerCount: managers.length,
          employeeCount: employees.length,
          memberCount: allMembers.length,
          projectCount,
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
    const team = await Team.findById(teamId).populate('managerId', 'name email role').lean();
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    if (actor.role !== USER_ROLES.ADMIN) {
      const u = await User.findById(actor._id).select('teamId teamIds').lean();
      const isMember =
        u?.teamId?.toString() === teamId ||
        u?.teamIds?.some((t) => t.toString() === teamId) ||
        team.memberIds?.some((m) => m.toString() === actor._id.toString()) ||
        team.managerIds?.some((m) => m.toString() === actor._id.toString()) ||
        team.managerId?.toString() === actor._id.toString() ||
        (typeof team.managerId === 'object' && (team.managerId as { _id?: Types.ObjectId })?._id?.toString() === actor._id.toString());

      if (!isMember) {
        throw new NotFoundError('Team not found');
      }
    }

    const tObjId = team._id;
    const memberIdList = [
      ...(team.memberIds || []),
      ...(team.managerIds || []),
      ...(team.managerId ? [(team.managerId as { _id?: Types.ObjectId })._id || team.managerId] : []),
    ];

    const [projectCount, teamUsers] = await Promise.all([
      Project.countDocuments({ teamId: tObjId }),
      User.find({
        $or: [
          { teamIds: tObjId },
          { teamId: tObjId },
          { _id: { $in: memberIdList } },
        ],
        isActive: true,
        role: { $in: [USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER] },
      })
        .select('name email role')
        .lean(),
    ]);

    const uniqueUsersMap = new Map<string, (typeof teamUsers)[0]>();
    teamUsers.forEach((u) => uniqueUsersMap.set(u._id.toString(), u as (typeof teamUsers)[0]));
    const allMembers = Array.from(uniqueUsersMap.values());

    const managers = allMembers.filter((u) => u.role === USER_ROLES.MANAGER);
    const employees = allMembers.filter((u) => u.role === USER_ROLES.EMPLOYEE);

    return {
      ...team,
      managers,
      managerCount: managers.length,
      employeeCount: employees.length,
      memberCount: allMembers.length,
      projectCount,
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
      managerObjectId = manager._id as Types.ObjectId;
    }

    const team = await Team.create({
      name: data.name,
      description: data.description,
      managerId: managerObjectId || undefined,
      managerIds: managerObjectId ? [managerObjectId] : [],
      memberIds: managerObjectId ? [managerObjectId] : [],
    });

    if (managerObjectId) {
      await User.findByIdAndUpdate(managerObjectId, {
        $addToSet: { teamIds: team._id },
        $set: { teamId: team._id },
      });
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
        // Remove primary manager
        if (team.managerId) {
          const oldMgrId = team.managerId;
          team.managerId = undefined;
          if (team.managerIds) {
            team.managerIds = team.managerIds.filter((m) => !m.equals(oldMgrId));
          }
          if (team.memberIds) {
            team.memberIds = team.memberIds.filter((m) => !m.equals(oldMgrId));
          }
          const userToUpdate = await User.findById(oldMgrId);
          if (userToUpdate) {
            if (userToUpdate.teamIds) {
              userToUpdate.teamIds = userToUpdate.teamIds.filter((t) => !t.equals(team._id));
            }
            if (userToUpdate.teamId && userToUpdate.teamId.equals(team._id)) {
              userToUpdate.teamId = userToUpdate.teamIds && userToUpdate.teamIds.length > 0 ? userToUpdate.teamIds[0] : undefined;
            }
            await userToUpdate.save();
          }
        }
      } else {
        const newManager = await User.findById(data.managerId);
        if (!newManager || !newManager.isActive || newManager.role !== USER_ROLES.MANAGER) {
          throw new BadRequestError('Specified manager must be an active user with MANAGER role');
        }

        const newMgrId = newManager._id as Types.ObjectId;
        team.managerId = newMgrId;
        if (!team.managerIds) team.managerIds = [];
        if (!team.managerIds.some((m) => m.equals(newMgrId))) {
          team.managerIds.push(newMgrId);
        }
        if (!team.memberIds) team.memberIds = [];
        if (!team.memberIds.some((m) => m.equals(newMgrId))) {
          team.memberIds.push(newMgrId);
        }

        if (!newManager.teamIds) newManager.teamIds = [];
        if (!newManager.teamIds.some((t) => t.equals(team._id))) {
          newManager.teamIds.push(team._id as Types.ObjectId);
        }
        if (!newManager.teamId) {
          newManager.teamId = team._id as Types.ObjectId;
        }
        await newManager.save();
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

    // Unassign this team from any user's teamIds and legacy teamId
    await User.updateMany(
      { teamIds: team._id },
      { $pull: { teamIds: team._id } }
    );
    await User.updateMany(
      { teamId: team._id },
      { $unset: { teamId: 1 } }
    );

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
    const team = await Team.findById(teamId).lean();
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    if (actor.role !== USER_ROLES.ADMIN) {
      const u = await User.findById(actor._id).select('teamId teamIds').lean();
      const isMember =
        u?.teamId?.toString() === teamId ||
        u?.teamIds?.some((t) => t.toString() === teamId) ||
        team.memberIds?.some((m) => m.toString() === actor._id.toString()) ||
        team.managerIds?.some((m) => m.toString() === actor._id.toString()) ||
        team.managerId?.toString() === actor._id.toString();

      if (!isMember) {
        throw new NotFoundError('Team not found');
      }
    }

    const tObjId = new Types.ObjectId(teamId);
    const memberIdList = [
      ...(team.memberIds || []),
      ...(team.managerIds || []),
      ...(team.managerId ? [team.managerId] : []),
    ];

    // Fetch both Employees and Managers who belong to or lead this team
    const members = await User.find({
      $or: [
        { teamIds: tObjId },
        { teamId: tObjId },
        { _id: { $in: memberIdList } },
      ],
      role: { $in: [USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER] },
      isActive: true,
    })
      .select('name email role teamId teamIds isActive')
      .sort({ role: 1, name: 1 })
      .lean();

    const uniqueMembers = new Map<string, (typeof members)[0]>();
    members.forEach((m) => uniqueMembers.set(m._id.toString(), m));
    return Array.from(uniqueMembers.values());
  }

  static async addTeamMember(teamId: string, userId: string, actor: AuthUserPayload) {
    if (actor.role !== USER_ROLES.ADMIN) {
      throw new ForbiddenError('Only Admins are permitted to add members to teams');
    }

    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new BadRequestError('User not found or is inactive');
    }

    if (user.role !== USER_ROLES.MANAGER && user.role !== USER_ROLES.EMPLOYEE) {
      throw new BadRequestError('Only Managers and Employees can be added to a team');
    }

    const teamObjId = team._id as Types.ObjectId;
    const userObjId = user._id as Types.ObjectId;

    // Add to user's teamIds without removing them from any other teams
    if (!user.teamIds) {
      user.teamIds = [];
    }
    if (user.teamId && !user.teamIds.some((t) => t.equals(user.teamId!))) {
      user.teamIds.push(user.teamId);
    }
    if (!user.teamIds.some((t) => t.equals(teamObjId))) {
      user.teamIds.push(teamObjId);
    }
    // Set active/primary teamId
    user.teamId = teamObjId;
    await user.save();

    // Add to team's memberIds
    if (!team.memberIds) {
      team.memberIds = [];
    }
    if (!team.memberIds.some((m) => m.equals(userObjId))) {
      team.memberIds.push(userObjId);
    }

    // If user is a MANAGER, also add to team.managerIds and team.managerId if unset
    if (user.role === USER_ROLES.MANAGER) {
      if (!team.managerIds) {
        team.managerIds = [];
      }
      if (!team.managerIds.some((m) => m.equals(userObjId))) {
        team.managerIds.push(userObjId);
      }
      if (!team.managerId) {
        team.managerId = userObjId;
      }
    }
    await team.save();

    return {
      success: true,
      message: `${user.role === USER_ROLES.MANAGER ? 'Manager' : 'Employee'} added to team successfully`,
      member: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
      },
    };
  }

  static async removeTeamMember(teamId: string, userId: string, actor: AuthUserPayload) {
    if (actor.role !== USER_ROLES.ADMIN) {
      throw new ForbiddenError('Only Admins are permitted to remove members from teams');
    }

    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const teamObjId = team._id as Types.ObjectId;
    const userObjId = user._id as Types.ObjectId;

    const isMember =
      user.teamId?.equals(teamObjId) ||
      user.teamIds?.some((t) => t.equals(teamObjId)) ||
      team.memberIds?.some((m) => m.equals(userObjId)) ||
      team.managerIds?.some((m) => m.equals(userObjId)) ||
      team.managerId?.equals(userObjId);

    if (!isMember) {
      throw new BadRequestError('User is not a member of this team');
    }

    // Remove team from user.teamIds without affecting their membership in other teams!
    if (user.teamIds) {
      user.teamIds = user.teamIds.filter((t) => !t.equals(teamObjId));
    }
    if (user.teamId && user.teamId.equals(teamObjId)) {
      user.teamId = user.teamIds && user.teamIds.length > 0 ? user.teamIds[0] : undefined;
    }
    await user.save();

    // Remove user from team.memberIds and team.managerIds
    if (team.memberIds) {
      team.memberIds = team.memberIds.filter((m) => !m.equals(userObjId));
    }
    if (team.managerIds) {
      team.managerIds = team.managerIds.filter((m) => !m.equals(userObjId));
    }
    if (team.managerId && team.managerId.equals(userObjId)) {
      team.managerId = team.managerIds && team.managerIds.length > 0 ? team.managerIds[0] : undefined;
    }
    await team.save();

    return {
      success: true,
      message: 'Member removed from team successfully',
    };
  }
}
