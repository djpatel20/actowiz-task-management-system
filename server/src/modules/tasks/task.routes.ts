import { Router } from 'express';
import { TaskController } from './task.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireActiveUser } from '../../middleware/activeUser.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.js';
import { uploadAttachmentMiddleware } from '../../middleware/upload.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  transitionStatusSchema,
  taskQuerySchema,
} from './task.schema.js';
import { USER_ROLES } from '../../config/constants.js';

const router = Router();

router.use(authenticate, requireActiveUser);

router.get('/export/csv', TaskController.exportCsv);

router.get('/', validateRequest({ query: taskQuerySchema }), TaskController.listTasks);

router.post(
  '/',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  validateRequest({ body: createTaskSchema }),
  TaskController.createTask
);

router.get('/:id', TaskController.getTaskById);

router.patch(
  '/:id',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  validateRequest({ body: updateTaskSchema }),
  TaskController.updateTask
);

router.delete(
  '/:id',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  TaskController.deleteTask
);

router.patch(
  '/:id/status',
  validateRequest({ body: transitionStatusSchema }),
  TaskController.transitionStatus
);

// Attachment routes
router.post('/:id/attachments', uploadAttachmentMiddleware, TaskController.uploadAttachment);
router.get('/:id/attachments', TaskController.listAttachments);
router.get('/:id/attachments/:attachmentId/download', TaskController.downloadAttachment);
router.delete('/:id/attachments/:attachmentId', TaskController.deleteAttachment);

export default router;
