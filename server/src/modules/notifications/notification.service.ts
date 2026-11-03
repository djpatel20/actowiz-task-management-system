import { FilterQuery, Types } from 'mongoose';
import { Notification, INotificationDocument } from './notification.model.js';
import { User } from '../users/user.model.js';
import { Team } from '../teams/team.model.js';
import { socketEmitter } from '../../socket/socketEmitter.js';
import { logger } from '../../utils/logger.js';
import { NOTIFICATION_TYPE, NotificationType, USER_ROLES } from '../../config/constants.js';

export class NotificationService {
  static async sendNotification(data: {
    userId: Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    link: string;
  }): Promise<INotificationDocument | null> {
    try {
      const notification = await Notification.create({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        isRead: false,
      });

      socketEmitter.toUser(data.userId, 'notification:new', { notification });
      return notification;
    } catch (error) {
      logger.error('Failed to create or emit notification:', error);
      return null;
    }
  }

  static async notifyManagerOrAdminsForReview(
    teamId: Types.ObjectId,
    taskId: Types.ObjectId,
    taskTitle: string
  ): Promise<void> {
    try {
      const team = await Team.findById(teamId);
      let notifiedManager = false;

      if (team && team.managerId) {
        const manager = await User.findById(team.managerId);
        if (manager && manager.isActive) {
          await this.sendNotification({
            userId: manager._id,
            type: NOTIFICATION_TYPE.TASK_SUBMITTED_FOR_REVIEW,
            title: 'Task Submitted for Review',
            message: `Task "${taskTitle}" is ready for your review.`,
            link: `/tasks?selected=${taskId.toString()}`,
          });
          notifiedManager = true;
        }
      }

      // Fallback: If no manager assigned, notify all active Admins so task is not orphaned
      if (!notifiedManager) {
        logger.warn(`No active manager found for team ${teamId.toString()}. Alerting admins for task review.`);
        const admins = await User.find({ role: USER_ROLES.ADMIN, isActive: true });
        for (const admin of admins) {
          await this.sendNotification({
            userId: admin._id,
            type: NOTIFICATION_TYPE.TASK_SUBMITTED_FOR_REVIEW,
            title: 'Task Review Fallback Alert',
            message: `Task "${taskTitle}" submitted for review in unmanaged team.`,
            link: `/tasks?selected=${taskId.toString()}`,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to dispatch review notifications:', error);
    }
  }

  static async listUserNotifications(
    userId: Types.ObjectId,
    query: { isRead?: boolean; page?: number; limit?: number }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<INotificationDocument> = { userId };
    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async markAsRead(notificationId: string, userId: Types.ObjectId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: new Types.ObjectId(notificationId), userId },
      { $set: { isRead: true } },
      { new: true }
    );
    return notification;
  }

  static async markAllAsRead(userId: Types.ObjectId) {
    await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
  }
}
