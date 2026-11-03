import { ClientSession, Types } from 'mongoose';
import { Activity, IActivityDocument } from './activity.model.js';
import { Task } from '../tasks/task.model.js';
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
      if (!actor.teamId || task.teamId.toString() !== actor.teamId.toString()) {
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
