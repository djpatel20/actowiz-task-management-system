import { Types } from 'mongoose';
import { Comment, ICommentDocument } from './comment.model.js';
import { Task } from '../tasks/task.model.js';
import { Project } from '../projects/project.model.js';
import { Team } from '../teams/team.model.js';
import { User } from '../users/user.model.js';
import { ActivityService } from '../activity/activity.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { AuthUserPayload } from '../../shared/types/index.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import {
  ACTIVITY_ACTION,
  NOTIFICATION_TYPE,
  PROJECT_STATUS,
  USER_ROLES,
} from '../../config/constants.js';

export class CommentService {
  static async listTaskComments(taskId: string, actor: AuthUserPayload): Promise<ICommentDocument[]> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (actor.role === USER_ROLES.MANAGER) {
      const project = await Project.findById(task.projectId);
      const userDoc = await User.findById(actor._id).select('teamId teamIds').lean();
      const isActorInTeam =
        (actor.teamId && task.teamId.toString() === actor.teamId.toString()) ||
        (userDoc?.teamId && task.teamId.toString() === userDoc.teamId.toString()) ||
        (userDoc?.teamIds && userDoc.teamIds.some((t: Types.ObjectId) => t.toString() === task.teamId.toString()));

      const isAssignee = Boolean(task.assigneeId && task.assigneeId.toString() === actor._id.toString());
      const pManagerId = project?.managerId
        ? (project.managerId as { _id?: Types.ObjectId })._id || project.managerId
        : null;
      const isProjectManager = Boolean(pManagerId && pManagerId.toString() === actor._id.toString());

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
      if (!task.assigneeId || task.assigneeId.toString() !== actor._id.toString()) {
        throw new NotFoundError('Task not found');
      }
    }

    const comments = await Comment.find({ taskId: task._id })
      .populate('authorId', 'name email role')
      .sort({ createdAt: 1 })
      .lean();

    return comments as unknown as ICommentDocument[];
  }

  static async addComment(
    taskId: string,
    content: string,
    actor: AuthUserPayload
  ): Promise<ICommentDocument> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (actor.role === USER_ROLES.MANAGER) {
      const project = await Project.findById(task.projectId);
      const userDoc = await User.findById(actor._id).select('teamId teamIds').lean();
      const isActorInTeam =
        (actor.teamId && task.teamId.toString() === actor.teamId.toString()) ||
        (userDoc?.teamId && task.teamId.toString() === userDoc.teamId.toString()) ||
        (userDoc?.teamIds && userDoc.teamIds.some((t: Types.ObjectId) => t.toString() === task.teamId.toString()));

      const isAssignee = Boolean(task.assigneeId && task.assigneeId.toString() === actor._id.toString());
      const pManagerId = project?.managerId
        ? (project.managerId as { _id?: Types.ObjectId })._id || project.managerId
        : null;
      const isProjectManager = Boolean(pManagerId && pManagerId.toString() === actor._id.toString());

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
      if (!task.assigneeId || task.assigneeId.toString() !== actor._id.toString()) {
        throw new NotFoundError('Task not found');
      }
    }

    const project = await Project.findById(task.projectId);
    if (!project || project.status === PROJECT_STATUS.ARCHIVED) {
      throw new BadRequestError('Cannot comment on tasks belonging to an archived project');
    }

    const comment = await Comment.create({
      taskId: task._id,
      authorId: actor._id,
      content,
    });

    // Append-only audit record
    await ActivityService.logActivity({
      taskId: task._id,
      actorId: actor._id,
      action: ACTIVITY_ACTION.COMMENT_ADDED,
    });

    // Notify assignee if author is someone else
    if (task.assigneeId.toString() !== actor._id.toString()) {
      await NotificationService.sendNotification({
        userId: task.assigneeId,
        type: NOTIFICATION_TYPE.COMMENT_ADDED,
        title: 'New Comment on Task',
        message: `${actor.name} commented on "${task.title}".`,
        link: `/tasks?selected=${task._id.toString()}`,
      });
    }

    // Notify team manager if author is not the manager
    const team = await Team.findById(task.teamId);
    if (team?.managerId && team.managerId.toString() !== actor._id.toString()) {
      await NotificationService.sendNotification({
        userId: team.managerId,
        type: NOTIFICATION_TYPE.COMMENT_ADDED,
        title: 'New Comment on Task',
        message: `${actor.name} commented on "${task.title}".`,
        link: `/tasks?selected=${task._id.toString()}`,
      });
    }

    const populated = await Comment.findById(comment._id)
      .populate('authorId', 'name email role')
      .lean();

    return populated as unknown as ICommentDocument;
  }
}
