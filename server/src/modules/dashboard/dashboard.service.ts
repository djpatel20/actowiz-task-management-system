import { FilterQuery, Types } from 'mongoose';
import { Task, ITaskDocument } from '../tasks/task.model.js';
import { Project } from '../projects/project.model.js';
import { Team } from '../teams/team.model.js';
import { User } from '../users/user.model.js';
import { AuthUserPayload } from '../../shared/types/index.js';
import { TASK_STATUS, USER_ROLES } from '../../config/constants.js';

export class DashboardService {
  static async getStats(actor: AuthUserPayload) {
    const userDoc = await User.findById(actor._id).select('teamId role name email').lean();
    const effectiveTeamId = userDoc?.teamId ? userDoc.teamId.toString() : actor.teamId?.toString();

    // Find all teams the user belongs to or manages
    const teamQueries: FilterQuery<any>[] = [];
    if (effectiveTeamId) {
      teamQueries.push({ _id: new Types.ObjectId(effectiveTeamId) });
    }
    if (actor.role === USER_ROLES.MANAGER) {
      teamQueries.push({ managerId: actor._id });
    }

    let myTeams: any[] = [];
    if (teamQueries.length > 0) {
      const foundTeams = await Team.find({ $or: teamQueries })
        .populate('managerId', 'name email role')
        .lean();

      myTeams = await Promise.all(
        foundTeams.map(async (team) => {
          const [teamManagers, memberCount, employeeCount, projectCount] = await Promise.all([
            User.find({
              $or: [
                { teamId: team._id, role: USER_ROLES.MANAGER },
                ...(team.managerId
                  ? [{ _id: (team.managerId as { _id?: Types.ObjectId })._id || team.managerId, role: USER_ROLES.MANAGER }]
                  : []),
              ],
              isActive: true,
            })
              .select('name email role')
              .lean(),
            User.countDocuments({ teamId: team._id, isActive: true }),
            User.countDocuments({ teamId: team._id, role: USER_ROLES.EMPLOYEE, isActive: true }),
            Project.countDocuments({ teamId: team._id }),
          ]);

          const uniqueManagersMap = new Map<string, { _id: Types.ObjectId | string; name: string; email: string; role?: string }>();
          teamManagers.forEach((m) => uniqueManagersMap.set(m._id.toString(), m as { _id: Types.ObjectId | string; name: string; email: string; role?: string }));
          const managers = Array.from(uniqueManagersMap.values());

          return {
            ...team,
            managers,
            managerCount: managers.length,
            employeeCount,
            memberCount,
            projectCount,
          };
        })
      );
    }

    const filter: FilterQuery<ITaskDocument> = {};
    let managerProjectIds: Types.ObjectId[] = [];
    let employeeProjectFilter: Record<string, unknown> = {};

    if (actor.role === USER_ROLES.EMPLOYEE) {
      filter.assigneeId = actor._id;

      const empProjectIds = await Task.distinct('projectId', { assigneeId: actor._id });
      const teamProjectIds = effectiveTeamId
        ? await Project.find({ teamId: new Types.ObjectId(effectiveTeamId) }).distinct('_id')
        : [];

      const allEmpProjectIds = Array.from(
        new Set([...empProjectIds.map(String), ...teamProjectIds.map(String)])
      ).map((id) => new Types.ObjectId(id));

      employeeProjectFilter = { _id: { $in: allEmpProjectIds } };
    } else if (actor.role === USER_ROLES.MANAGER) {
      const teamIds = myTeams.map((t) => t._id);

      const projects = await Project.find({
        $or: [
          { managerId: actor._id },
          ...(teamIds.length > 0
            ? [
                {
                  teamId: { $in: teamIds },
                  $or: [{ managerId: { $exists: false } }, { managerId: null }],
                },
              ]
            : []),
        ],
      }).select('_id');

      managerProjectIds = projects.map((p) => p._id as Types.ObjectId);

      filter.projectId = { $in: managerProjectIds };
    }
    // Admin has global filter (empty filter)

    const now = new Date();

    const [openTasks, inReviewTasks, completedTasks, overdueTasks, totalProjects] =
      await Promise.all([
        Task.countDocuments({
          ...filter,
          status: { $in: [TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS] },
        }),
        Task.countDocuments({
          ...filter,
          status: TASK_STATUS.IN_REVIEW,
        }),
        Task.countDocuments({
          ...filter,
          status: TASK_STATUS.DONE,
        }),
        Task.countDocuments({
          ...filter,
          dueDate: { $lt: now },
          status: { $ne: TASK_STATUS.DONE },
        }),
        actor.role === USER_ROLES.ADMIN
          ? Project.countDocuments()
          : actor.role === USER_ROLES.MANAGER
          ? Project.countDocuments({ _id: { $in: managerProjectIds } })
          : Project.countDocuments(employeeProjectFilter),
      ]);

    // Also get recent 5 tasks for quick overview
    const recentTasks = await Task.find(filter)
      .populate('projectId', 'name')
      .populate('assigneeId', 'name')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    // Recent projects for dashboard overview
    let projectScopeFilter: Record<string, unknown> = {};
    if (actor.role === USER_ROLES.MANAGER) {
      projectScopeFilter = { _id: { $in: managerProjectIds } };
    } else if (actor.role === USER_ROLES.EMPLOYEE) {
      projectScopeFilter = employeeProjectFilter;
    }

    const recentProjects = await Project.find(projectScopeFilter)
      .populate('teamId', 'name')
      .populate('managerId', 'name email')
      .sort({ updatedAt: -1 })
      .limit(4)
      .lean();

    return {
      openTasks,
      inReviewTasks,
      completedTasks,
      overdueTasks,
      totalProjects,
      recentTasks,
      recentProjects,
      myTeam: myTeams.length > 0 ? myTeams[0] : null,
      myTeams,
    };
  }
}
