import { ClientSession, Types } from 'mongoose';
import { Activity, IActivityDocument } from './activity.model.js';
import { Task } from '../tasks/task.model.js';
import { Team } from '../teams/team.model.js';
import { Project } from '../projects/project.model.js';
import { User } from '../users/user.model.js';
import { AuthUserPayload } from '../../shared/types/index.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { ActivityAction, USER_ROLES } from '../../config/constants.js';

export class ActivityService {
  static async logActivity(
    data: {
      taskId: Types.ObjectId;
      actorId: Types.ObjectId;
      action: ActivityAction;
      details?: Record<string, unknown>;
      oldValue?: string;
      newValue?: string;
      reason?: string;
    },
    session?: ClientSession
  ): Promise<IActivityDocument> {
    const [activity] = await Activity.create(
      [
        {
          taskId: data.taskId,
          actorId: data.actorId,
          action: data.action,
          details: data.details || {},
          oldValue: data.oldValue,
          newValue: data.newValue,
          reason: data.reason,
          createdAt: new Date(),
        },
      ],
      { session }
    );
    return activity;
  }

  static async getTaskActivities(taskId: string, actor: AuthUserPayload) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (actor.role === USER_ROLES.MANAGER) {
      const project = await Project.findById(task.projectId).select('managerId').lean();
      const pManagerId = project?.managerId ? project.managerId.toString() : null;
      const isProjectManager = Boolean(pManagerId && pManagerId === actor._id.toString());
      const isAssignee = Boolean(task.assigneeId && task.assigneeId.toString() === actor._id.toString());

      const userDoc = await User.findById(actor._id).select('teamId teamIds').lean();
      const isActorInTeam =
        (actor.teamId && task.teamId.toString() === actor.teamId.toString()) ||
        (userDoc?.teamId && task.teamId.toString() === userDoc.teamId.toString()) ||
        (userDoc?.teamIds && userDoc.teamIds.some((t: Types.ObjectId) => t.toString() === task.teamId.toString()));

      const hasTeamAccess =
        isActorInTeam ||
        Boolean(
          await Team.exists({
            _id: task.teamId,
            $or: [{ managerId: actor._id }, { managerIds: actor._id }, { memberIds: actor._id }],
          })
        );

      const canAccess = isAssignee || (pManagerId ? isProjectManager : hasTeamAccess);

      if (!canAccess) {
        throw new NotFoundError('Task not found');
      }
    } else if (actor.role === USER_ROLES.EMPLOYEE) {
      if (task.assigneeId.toString() !== actor._id.toString()) {
        throw new NotFoundError('Task not found');
      }
    }

    const activities = await Activity.find({ taskId: task._id })
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    return activities;
  }
}
