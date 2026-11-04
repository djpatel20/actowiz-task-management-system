import { Router } from 'express';
import { ProjectController } from './project.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireActiveUser } from '../../middleware/activeUser.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
} from './project.schema.js';
import { USER_ROLES } from '../../config/constants.js';

const router = Router();

router.use(authenticate, requireActiveUser);

router.get('/', validateRequest({ query: projectQuerySchema }), ProjectController.listProjects);

router.post(
  '/',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  validateRequest({ body: createProjectSchema }),
  ProjectController.createProject
);

router.get('/:id', ProjectController.getProjectById);

router.patch(
  '/:id',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  validateRequest({ body: updateProjectSchema }),
  ProjectController.updateProject
);

router.delete(
  '/:id',
  requireRole(USER_ROLES.ADMIN),
  ProjectController.deleteProject
);

export default router;
