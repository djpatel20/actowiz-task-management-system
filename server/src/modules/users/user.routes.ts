import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireActiveUser } from '../../middleware/activeUser.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userQuerySchema,
} from './user.schema.js';
import { USER_ROLES } from '../../config/constants.js';

const router = Router();

router.use(authenticate, requireActiveUser, requireRole(USER_ROLES.ADMIN));

router.get('/', validateRequest({ query: userQuerySchema }), UserController.listUsers);
router.post('/', validateRequest({ body: createUserSchema }), UserController.createUser);
router.get('/:id', UserController.getUserById);
router.patch('/:id', validateRequest({ body: updateUserSchema }), UserController.updateUser);
router.patch(
  '/:id/status',
  validateRequest({ body: updateUserStatusSchema }),
  UserController.updateUserStatus
);

export default router;
