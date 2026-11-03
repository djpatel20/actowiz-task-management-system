import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireActiveUser } from '../../middleware/activeUser.middleware.js';
import { AuthenticatedRequest } from '../../shared/types/index.js';
import { ActivityService } from './activity.service.js';

const router = Router();

router.use(authenticate, requireActiveUser);

router.get('/tasks/:id/activity', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const activities = await ActivityService.getTaskActivities(req.params.id, req.user!);
    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
