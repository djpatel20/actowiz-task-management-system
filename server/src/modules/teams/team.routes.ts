import { Router } from 'express';
import { TeamController } from './team.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireActiveUser } from '../../middleware/activeUser.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.js';
import { createTeamSchema, updateTeamSchema, teamQuerySchema } from './team.schema.js';
import { USER_ROLES } from '../../config/constants.js';

const router = Router();

router.use(authenticate, requireActiveUser);

router.get(
  '/',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  validateRequest({ query: teamQuerySchema }),
  TeamController.listTeams
);

router.post(
  '/',
  requireRole(USER_ROLES.ADMIN),
  validateRequest({ body: createTeamSchema }),
  TeamController.createTeam
);

router.get('/:id', TeamController.getTeamById);

router.patch(
  '/:id',
  requireRole(USER_ROLES.ADMIN),
  validateRequest({ body: updateTeamSchema }),
  TeamController.updateTeam
);

router.delete(
  '/:id',
  requireRole(USER_ROLES.ADMIN),
  TeamController.deleteTeam
);

router.get('/:id/members', TeamController.getTeamMembers);

export default router;
