import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validateRequest } from '../../middleware/validate.js';
import { loginSchema } from './auth.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireActiveUser } from '../../middleware/activeUser.middleware.js';
import { loginLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.post('/login', loginLimiter, validateRequest({ body: loginSchema }), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, requireActiveUser, AuthController.me);

export default router;
