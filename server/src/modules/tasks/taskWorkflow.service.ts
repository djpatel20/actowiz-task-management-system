import mongoose, { Types } from 'mongoose';
import { Task, ITaskDocument } from './task.model.js';
import { Project } from '../projects/project.model.js';
import { Activity } from '../activity/activity.model.js';
import { NotificationService } from '../notifications/notification.service.js';
import { socketEmitter } from '../../socket/socketEmitter.js';
import { AuthUserPayload } from '../../shared/types/index.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/AppError.js';
import {
  ACTIVITY_ACTION,
  NOTIFICATION_TYPE,
  PROJECT_STATUS,
  TASK_STATUS,
  TaskStatus,
  USER_ROLES,
} from '../../config/constants.js';
import { logger } from '../../utils/logger.js';

export class TaskWorkflowService {
  static async transitionStatus(
    taskId: string,
    targetStatus: TaskStatus,
    actor: AuthUserPayload,
    clientVersion: number,
    rejectionReason?: string
  ): Promise<ITaskDocument> {
    // 1. Fresh database fetch
    const task = await Task.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      throw new NotFoundError('Parent project not found');
    }

    // 2. Project freeze check
    if (project.status === PROJECT_STATUS.ARCHIVED) {
      throw new BadRequestError('Cannot modify resources belonging to an archived project');
    }

    // 3. Derive state from DB
    const dbCurrentStatus = task.status;

    if (dbCurrentStatus === TASK_STATUS.DONE) {
      throw new BadRequestError(
        'Tasks marked DONE are permanently completed (terminal) and cannot transition to any other status'
      );
    }

    if (dbCurrentStatus === targetStatus) {
      return task;
    }

    // 4. Fresh permission & scoping check
    if (actor.role === USER_ROLES.EMPLOYEE) {
      if (task.assigneeId.toString() !== actor._id.toString()) {
        throw new NotFoundError('Task not found');
      }

      // Employees can only perform: TODO -> IN_PROGRESS, IN_PROGRESS -> IN_REVIEW
      if (
        !(
          (dbCurrentStatus === TASK_STATUS.TODO && targetStatus === TASK_STATUS.IN_PROGRESS) ||
          (dbCurrentStatus === TASK_STATUS.IN_PROGRESS && targetStatus === TASK_STATUS.IN_REVIEW)
        )
      ) {
        throw new ForbiddenError(
          'Employees are only permitted to start work (TODO -> IN_PROGRESS) or submit for review (IN_PROGRESS -> IN_REVIEW)'
        );
      }
    } else if (actor.role === USER_ROLES.MANAGER) {
      if (!actor.teamId || task.teamId.toString() !== actor.teamId.toString()) {
        throw new NotFoundError('Task not found');
      }
    }

    // 5. State Machine Validation
    const isRejection =
      dbCurrentStatus === TASK_STATUS.IN_REVIEW && targetStatus === TASK_STATUS.IN_PROGRESS;
    const isApproval =
      dbCurrentStatus === TASK_STATUS.IN_REVIEW && targetStatus === TASK_STATUS.DONE;
    const isStart =
      dbCurrentStatus === TASK_STATUS.TODO && targetStatus === TASK_STATUS.IN_PROGRESS;
    const isSubmit =
      dbCurrentStatus === TASK_STATUS.IN_PROGRESS && targetStatus === TASK_STATUS.IN_REVIEW;

    if (!isRejection && !isApproval && !isStart && !isSubmit) {
      throw new BadRequestError(
        `Invalid status transition from '${dbCurrentStatus}' to '${targetStatus}'`
      );
    }

    // 6. Review Rejection Validation
    let sanitizedReason: string | undefined;
    if (isRejection) {
      if (!rejectionReason || typeof rejectionReason !== 'string') {
        throw new BadRequestError('A non-empty rejection reason is mandatory when rejecting a review');
      }
      sanitizedReason = rejectionReason.trim();
      if (sanitizedReason.length < 5) {
        throw new BadRequestError('Rejection reason must be at least 5 characters');
      }
    }

    // Administrative override flag
    const isOverride =
      actor.role !== USER_ROLES.EMPLOYEE &&
      !isApproval &&
      !isRejection &&
      task.assigneeId.toString() !== actor._id.toString();

    // 7. Atomic Execution with OCC
    // Validate if MongoDB deployment supports multi-document transactions (requires Replica Set or Sharded cluster)
    const topologyType = (mongoose.connection as any)?.client?.topology?.description?.type;
    const supportsTransactions =
      topologyType === 'ReplicaSetWithPrimary' ||
      topologyType === 'ReplicaSetNoPrimary' ||
      topologyType === 'Sharded';

    let updatedTask: ITaskDocument | null = null;
    let session: mongoose.ClientSession | null = null;

    if (supportsTransactions) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (sessionErr) {
        logger.warn('Failed to start transaction session, proceeding without transaction', sessionErr);
        session = null;
      }
    }

    try {
      const sessionOptions = session ? { session } : {};

      updatedTask = await Task.findOneAndUpdate(
        {
          _id: task._id,
          status: dbCurrentStatus,
          __v: clientVersion,
        },
        {
          $set: {
            status: targetStatus,
            ...(targetStatus === TASK_STATUS.DONE ? { completedAt: new Date() } : {}),
          },
          $inc: { __v: 1 },
        },
        { new: true, ...sessionOptions }
      );

      if (!updatedTask) {
        throw new ConflictError(
          'Task was modified concurrently by another user. Please refresh and review.'
        );
      }

      await Activity.create(
        [
          {
            taskId: updatedTask._id,
            actorId: actor._id,
            action: isRejection ? ACTIVITY_ACTION.REVIEW_REJECTED : ACTIVITY_ACTION.STATUS_CHANGED,
            oldValue: dbCurrentStatus,
            newValue: targetStatus,
            reason: isRejection ? sanitizedReason : undefined,
            details: {
              isOverride,
            },
            createdAt: new Date(),
          },
        ],
        sessionOptions
      );

      if (session) {
        await session.commitTransaction();
      }
    } catch (error) {
      if (session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }

    // 8. Post-Commit Real-Time Socket.IO & In-App Notifications (Isolated Error Handling)
    try {
      const statusPayload = {
        taskId: updatedTask._id.toString(),
        oldStatus: dbCurrentStatus,
        newStatus: targetStatus,
        actorId: actor._id.toString(),
        isOverride,
      };

      // Emit status changed to assignee and manager
      socketEmitter.toUser(updatedTask.assigneeId, 'task:status_changed', statusPayload);

      if (isSubmit) {
        await NotificationService.notifyManagerOrAdminsForReview(
          updatedTask.teamId,
          updatedTask._id,
          updatedTask.title
        );
      } else if (isApproval) {
        await NotificationService.sendNotification({
          userId: updatedTask.assigneeId,
          type: NOTIFICATION_TYPE.TASK_REVIEW_APPROVED,
          title: 'Task Approved',
          message: `Your task "${updatedTask.title}" was reviewed and approved!`,
          link: `/tasks?selected=${updatedTask._id.toString()}`,
        });
      } else if (isRejection) {
        await NotificationService.sendNotification({
          userId: updatedTask.assigneeId,
          type: NOTIFICATION_TYPE.TASK_REVIEW_REJECTED,
          title: 'Task Review Rejected',
          message: `Review rejected for "${updatedTask.title}": ${sanitizedReason}`,
          link: `/tasks?selected=${updatedTask._id.toString()}`,
        });
      }
    } catch (notificationError) {
      logger.error('Failed post-commit notification dispatch in workflow service:', notificationError);
    }

    return updatedTask;
  }
}
