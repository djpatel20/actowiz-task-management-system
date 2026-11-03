import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireActiveUser } from '../../middleware/activeUser.middleware.js';

const router = Router();

router.use(authenticate, requireActiveUser);

router.get('/stats', DashboardController.getStats);

export default router;
