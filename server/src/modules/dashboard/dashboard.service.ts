import { FilterQuery, Types } from 'mongoose';
import { Task, ITaskDocument } from '../tasks/task.model.js';
import { Project } from '../projects/project.model.js';
import { User } from '../users/user.model.js';
import { AuthUserPayload } from '../../shared/types/index.js';
import { TASK_STATUS, USER_ROLES } from '../../config/constants.js';

export class DashboardService {
  static async getStats(actor: AuthUserPayload) {
    const filter: FilterQuery<ITaskDocument> = {};

    if (actor.role === USER_ROLES.EMPLOYEE) {
      filter.assigneeId = actor._id;
    } else if (actor.role === USER_ROLES.MANAGER) {
      filter.teamId = actor.teamId || new Types.ObjectId();
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
          ? Project.countDocuments({ teamId: actor.teamId })
          : Task.distinct('projectId', { assigneeId: actor._id }).then((ids) => ids.length),
      ]);

    // Also get recent 5 tasks for quick overview
    const recentTasks = await Task.find(filter)
      .populate('projectId', 'name')
      .populate('assigneeId', 'name')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    return {
      openTasks,
      inReviewTasks,
      completedTasks,
      overdueTasks,
      totalProjects,
      recentTasks,
    };
  }
}
