import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { User } from '../src/modules/users/user.model.js';
import { Team } from '../src/modules/teams/team.model.js';
import { Project } from '../src/modules/projects/project.model.js';
import { Task } from '../src/modules/tasks/task.model.js';
import { Comment } from '../src/modules/comments/comment.model.js';
import { Activity } from '../src/modules/activity/activity.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { RefreshToken } from '../src/modules/auth/session.model.js';
import {
  ACTIVITY_ACTION,
  PROJECT_STATUS,
  TASK_PRIORITY,
  TASK_STATUS,
  USER_ROLES,
} from '../src/config/constants.js';
import { logger } from '../src/utils/logger.js';

export const seedDatabase = async () => {
  logger.info('Starting database seeding...');

  // 1. Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Team.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Comment.deleteMany({}),
    Activity.deleteMany({}),
    Notification.deleteMany({}),
    RefreshToken.deleteMany({}),
  ]);
  logger.info('Cleaned existing collections.');

  // 2. Hash passwords
  const passwordAdmin = await bcrypt.hash('AdminPass123!', 12);
  const passwordManager = await bcrypt.hash('ManagerPass123!', 12);
  const passwordEmployee = await bcrypt.hash('EmployeePass123!', 12);

  // 3. Create Admin user
  const admin = await User.create({
    name: 'Sarah Admin',
    email: 'admin@actowiz.com',
    passwordHash: passwordAdmin,
    role: USER_ROLES.ADMIN,
    teamId: null,
    isActive: true,
  });

  // 4. Create Teams first (so managers and employees have valid teamIds)
  const teamAlpha = await Team.create({
    name: 'Team Alpha',
    description: 'Engineering & Architecture functional unit',
  });

  const teamBeta = await Team.create({
    name: 'Team Beta',
    description: 'Product Design & User Research functional unit',
  });

  // 5. Create Managers
  const managerAlpha = await User.create({
    name: 'Alex River',
    email: 'manager.alpha@actowiz.com',
    passwordHash: passwordManager,
    role: USER_ROLES.MANAGER,
    teamId: teamAlpha._id,
    isActive: true,
  });

  const managerBeta = await User.create({
    name: 'Marcus Vance',
    email: 'manager.beta@actowiz.com',
    passwordHash: passwordManager,
    role: USER_ROLES.MANAGER,
    teamId: teamBeta._id,
    isActive: true,
  });

  // Link managerId on Teams
  await Team.findByIdAndUpdate(teamAlpha._id, { managerId: managerAlpha._id });
  await Team.findByIdAndUpdate(teamBeta._id, { managerId: managerBeta._id });

  // 6. Create Employees
  const elena = await User.create({
    name: 'Elena Rostova',
    email: 'elena@actowiz.com',
    passwordHash: passwordEmployee,
    role: USER_ROLES.EMPLOYEE,
    teamId: teamAlpha._id,
    isActive: true,
  });

  const david = await User.create({
    name: 'David Kim',
    email: 'david@actowiz.com',
    passwordHash: passwordEmployee,
    role: USER_ROLES.EMPLOYEE,
    teamId: teamAlpha._id,
    isActive: true,
  });

  const maya = await User.create({
    name: 'Maya Patel',
    email: 'maya@actowiz.com',
    passwordHash: passwordEmployee,
    role: USER_ROLES.EMPLOYEE,
    teamId: teamBeta._id,
    isActive: true,
  });

  logger.info('Created Users & Teams.');

  // 7. Create Sample Projects
  const now = new Date();
  const projectAlpha = await Project.create({
    name: 'Fintech Core Banking Migration',
    description: 'Migration of legacy settlement service to event-driven modular architecture.',
    client: 'Apex Financial',
    startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    teamId: teamAlpha._id,
    status: PROJECT_STATUS.ACTIVE,
    createdBy: managerAlpha._id,
  });

  const projectBeta = await Project.create({
    name: 'Mobile Design System & Brand Refresh',
    description: 'Unification of mobile UI components and brand guidelines across client platforms.',
    client: 'Lumina Health',
    startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
    teamId: teamBeta._id,
    status: PROJECT_STATUS.ACTIVE,
    createdBy: managerBeta._id,
  });

  logger.info('Created Projects.');

  // 8. Create Sample Tasks
  const tasksData = [
    // Team Alpha Tasks
    {
      title: 'Implement OAuth 2.0 PKCE Flow',
      description: 'Strengthen client auth exchange with proof key for code exchange verification.',
      projectId: projectAlpha._id,
      teamId: teamAlpha._id,
      assigneeId: elena._id,
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.HIGH,
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      createdBy: managerAlpha._id,
      __v: 0,
    },
    {
      title: 'Optimize MongoDB Aggregation Pipelines',
      description: 'Add compound indices and project stage optimizations for high-throughput queries.',
      projectId: projectAlpha._id,
      teamId: teamAlpha._id,
      assigneeId: david._id,
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.MEDIUM,
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      createdBy: managerAlpha._id,
      __v: 1,
    },
    {
      title: 'Build Resilient Database Retry Interceptors',
      description: 'Handle transient network and replica set failover disconnections automatically.',
      projectId: projectAlpha._id,
      teamId: teamAlpha._id,
      assigneeId: elena._id,
      status: TASK_STATUS.IN_REVIEW,
      priority: TASK_PRIORITY.URGENT,
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      createdBy: managerAlpha._id,
      __v: 2,
    },
    {
      title: 'Setup Initial Docker Multi-Stage Builds',
      description: 'Containerize client and server builds with non-root security principles.',
      projectId: projectAlpha._id,
      teamId: teamAlpha._id,
      assigneeId: david._id,
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.MEDIUM,
      dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      createdBy: admin._id,
      __v: 3,
    },
    // Team Beta Tasks
    {
      title: 'User Persona Research & Accessibility Review',
      description: 'Conduct WCAG 2.1 AA audit on all core customer flows and design tokens.',
      projectId: projectBeta._id,
      teamId: teamBeta._id,
      assigneeId: maya._id,
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.HIGH,
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdBy: managerBeta._id,
      __v: 0,
    },
    {
      title: 'High-Fidelity Figma Component Library',
      description: 'Export design tokens and assemble responsive card and drawer molecules.',
      projectId: projectBeta._id,
      teamId: teamBeta._id,
      assigneeId: maya._id,
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.MEDIUM,
      dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      createdBy: managerBeta._id,
      __v: 1,
    },
  ];

  const tasks = await Task.insertMany(tasksData);

  // 9. Create Activities for seeded tasks
  for (const t of tasks) {
    await Activity.create({
      taskId: t._id,
      actorId: t.createdBy,
      action: ACTIVITY_ACTION.TASK_CREATED,
      newValue: TASK_STATUS.TODO,
      createdAt: new Date(t.createdAt.getTime() - 2 * 3600 * 1000),
    });

    if (t.status === TASK_STATUS.IN_PROGRESS || t.status === TASK_STATUS.IN_REVIEW || t.status === TASK_STATUS.DONE) {
      await Activity.create({
        taskId: t._id,
        actorId: t.assigneeId,
        action: ACTIVITY_ACTION.STATUS_CHANGED,
        oldValue: TASK_STATUS.TODO,
        newValue: TASK_STATUS.IN_PROGRESS,
        createdAt: new Date(t.createdAt.getTime() - 1 * 3600 * 1000),
      });
    }

    if (t.status === TASK_STATUS.IN_REVIEW || t.status === TASK_STATUS.DONE) {
      await Activity.create({
        taskId: t._id,
        actorId: t.assigneeId,
        action: ACTIVITY_ACTION.STATUS_CHANGED,
        oldValue: TASK_STATUS.IN_PROGRESS,
        newValue: TASK_STATUS.IN_REVIEW,
        createdAt: new Date(t.createdAt.getTime() - 1800 * 1000),
      });
    }

    if (t.status === TASK_STATUS.DONE) {
      await Activity.create({
        taskId: t._id,
        actorId: admin._id,
        action: ACTIVITY_ACTION.STATUS_CHANGED,
        oldValue: TASK_STATUS.IN_REVIEW,
        newValue: TASK_STATUS.DONE,
        createdAt: t.completedAt || new Date(),
      });
    }
  }

  logger.info('Created Tasks & Activities.');

  console.log('\n======================================================');
  console.log(' SEEDING COMPLETED SUCCESSFULLY');
  console.log('======================================================');
  console.log('| Role     | Name          | Email                      | Password         | Team');
  console.log('|----------|---------------|----------------------------|------------------|------------');
  console.log('| Admin    | Sarah Admin   | admin@actowiz.com          | AdminPass123!    | Global');
  console.log('| Manager  | Alex River    | manager.alpha@actowiz.com  | ManagerPass123!  | Team Alpha');
  console.log('| Manager  | Marcus Vance  | manager.beta@actowiz.com   | ManagerPass123!  | Team Beta');
  console.log('| Employee | Elena Rostova | elena@actowiz.com          | EmployeePass123! | Team Alpha');
  console.log('| Employee | David Kim     | david@actowiz.com          | EmployeePass123! | Team Alpha');
  console.log('| Employee | Maya Patel    | maya@actowiz.com           | EmployeePass123! | Team Beta');
  console.log('======================================================\n');
};

const run = async () => {
  try {
    await connectDatabase();
    await seedDatabase();
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
};

// Execute if called directly
if (process.argv[1]?.includes('seed')) {
  run();
}
