import { Router } from 'express';
import { CommentController } from './comment.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireActiveUser } from '../../middleware/activeUser.middleware.js';
import { validateRequest } from '../../middleware/validate.js';
import { createCommentSchema } from './comment.schema.js';

const router = Router();

router.use(authenticate, requireActiveUser);

router.get('/tasks/:id/comments', CommentController.listTaskComments);
router.post(
  '/tasks/:id/comments',
  validateRequest({ body: createCommentSchema }),
  CommentController.addComment
);

export default router;
