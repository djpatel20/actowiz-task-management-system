import { Task } from '../tasks/task.model.js';
import { NotificationService } from './notification.service.js';
import { NOTIFICATION_TYPE, TASK_STATUS } from '../../config/constants.js';
import { logger } from '../../utils/logger.js';

let intervalTimer: NodeJS.Timeout | null = null;

export const runDueSoonCheck = async (): Promise<number> => {
  try {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find non-completed tasks due within next 24 hours that haven't had a reminder sent in last 24h
    const dueTasks = await Task.find({
      status: { $ne: TASK_STATUS.DONE },
      dueDate: { $gte: now, $lte: next24Hours },
      $or: [
        { lastDueReminderSentAt: { $exists: false } },
        { lastDueReminderSentAt: null },
        { lastDueReminderSentAt: { $lt: dayAgo } },
      ],
    });

    if (dueTasks.length === 0) {
      return 0;
    }

    let sentCount = 0;
    for (const task of dueTasks) {
      if (!task.assigneeId) continue;

      await NotificationService.sendNotification({
        userId: task.assigneeId,
        type: NOTIFICATION_TYPE.TASK_DUE_SOON,
        title: 'Task Due Soon',
        message: `Task "${task.title}" deadline is within the next 24 hours.`,
        link: `/tasks?selected=${task._id.toString()}`,
      });

      task.lastDueReminderSentAt = new Date();
      await task.save();
      sentCount++;
    }

    logger.info(`[DueSoonScheduler] Sent ${sentCount} due-soon notification(s).`);
    return sentCount;
  } catch (error) {
    logger.error('[DueSoonScheduler] Error checking due-soon tasks:', error);
    return 0;
  }
};

export const startDueSoonScheduler = (intervalMs = 60 * 60 * 1000): void => {
  if (intervalTimer) return;

  logger.info('[DueSoonScheduler] Starting background task deadline scheduler.');
  // Run on startup
  runDueSoonCheck().catch(() => {});

  intervalTimer = setInterval(() => {
    runDueSoonCheck().catch(() => {});
  }, intervalMs);

  // Unref so it doesn't block graceful shutdown
  if (intervalTimer.unref) {
    intervalTimer.unref();
  }
};

export const stopDueSoonScheduler = (): void => {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
    logger.info('[DueSoonScheduler] Stopped background scheduler.');
  }
};
