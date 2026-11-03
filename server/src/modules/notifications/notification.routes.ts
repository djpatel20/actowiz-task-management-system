import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireActiveUser } from '../../middleware/activeUser.middleware.js';
import { AuthenticatedRequest } from '../../shared/types/index.js';
import { NotificationService } from './notification.service.js';

const router = Router();

router.use(authenticate, requireActiveUser);

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const isReadParam = req.query.isRead;
    const isRead = isReadParam !== undefined ? isReadParam === 'true' : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await NotificationService.listUserNotifications(req.user!._id, {
      isRead,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result.notifications,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        unreadCount: result.unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id, req.user!._id);
    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/read-all', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await NotificationService.markAllAsRead(req.user!._id);
    res.status(200).json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
