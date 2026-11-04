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

  // 4. Create Functional Teams: Developer, UI/UX, and QA & Testing
  const teamDeveloper = await Team.create({
    name: 'Developer Team',
    description: 'Full-stack engineering, microservices, and core platform development',
  });

  const teamUIUX = await Team.create({
    name: 'UI/UX Design Team',
    description: 'User experience research, design system tokens, and interactive prototyping',
  });

  const teamQA = await Team.create({
    name: 'QA & Testing Team',
    description: 'Quality assurance, automated end-to-end regression, and security testing',
  });

  // 5. Create 2 Managers
  const managerAlpha = await User.create({
    name: 'Alex River',
    email: 'manager.alpha@actowiz.com',
    passwordHash: passwordManager,
    role: USER_ROLES.MANAGER,
    teamId: teamDeveloper._id,
    teamIds: [teamDeveloper._id, teamQA._id],
    isActive: true,
  });

  const managerBeta = await User.create({
    name: 'Marcus Vance',
    email: 'manager.beta@actowiz.com',
    passwordHash: passwordManager,
    role: USER_ROLES.MANAGER,
    teamId: teamUIUX._id,
    teamIds: [teamUIUX._id],
    isActive: true,
  });

  // 6. Create Bunch of Employees across Developer, UI/UX, and QA Teams
  // --- Developer Team Employees ---
  const elena = await User.create({
    name: 'Elena Rostova',
    email: 'elena@actowiz.com',
    passwordHash: passwordEmployee,
    role: USER_ROLES.EMPLOYEE,
    teamId: teamDeveloper._id,
    teamIds: [teamDeveloper._id],
    isActive: true,
  });

  const david = await User.create({
    name: 'David Kim',
    email: 'david@actowiz.com',
    passwordHash: passwordEmployee,
    role: USER_ROLES.EMPLOYEE,
    teamId: teamDeveloper._id,
    teamIds: [teamDeveloper._id],
    isActive: true,
  });

  const liam = await User.create({
    name: 'Liam Chen',
    email: 'liam@actowiz.com',
    passwordHash: passwordEmployee,
    role: USER_ROLES.EMPLOYEE,
    teamId: teamDeveloper._id,
    teamIds: [teamDeveloper._id],
    isActive: true,
  });

  const priya = await User.create({
    name: 'Priya Sharma',
    email: 'priya@actowiz.com',
    passwordHash: passwordEmployee,
    role: USER_ROLES.EMPLOYEE,
    teamId: teamDeveloper._id,
    teamIds: [teamDeveloper._id],
    isActive: true,
  });

  // --- UI/UX Design Team Employees ---
  const maya = await User.create({
    name: 'Maya Patel',
    email: 'maya@actowiz.com',
    passwordHash: passwordEmployee,
    role: USER_ROLES.EMPLOYEE,
    teamId: teamUIUX._id,
    teamIds: [teamUIUX._id],
    isActive: true,
  });

  const lucas = await User.create({
    name: 'Lucas Moreau',
    email: 'lucas@actowiz.com',
    passwordHash: passwordEmployee,
    role: USER_ROLES.EMPLOYEE,
    teamId: teamUIUX._id,
    teamIds: [teamUIUX._id],
    isActive: true,
  });

  // --- QA & Testing Team Employees ---
  const sophia = await User.create({
    name: 'Sophia Bennett',
    email: 'sophia@actowiz.com',
    passwordHash: passwordEmployee,
    role: USER_ROLES.EMPLOYEE,
    teamId: teamQA._id,
    teamIds: [teamQA._id],
    isActive: true,
  });

  const arjun = await User.create({
    name: 'Arjun Nair',
    email: 'arjun@actowiz.com',
    passwordHash: passwordEmployee,
    role: USER_ROLES.EMPLOYEE,
    teamId: teamQA._id,
    teamIds: [teamQA._id],
    isActive: true,
  });

  // 7. Link Managers and Member rosters on Teams
  await Team.findByIdAndUpdate(teamDeveloper._id, {
    managerId: managerAlpha._id,
    managerIds: [managerAlpha._id],
    memberIds: [elena._id, david._id, liam._id, priya._id],
  });

  await Team.findByIdAndUpdate(teamUIUX._id, {
    managerId: managerBeta._id,
    managerIds: [managerBeta._id],
    memberIds: [maya._id, lucas._id],
  });

  await Team.findByIdAndUpdate(teamQA._id, {
    managerId: managerAlpha._id,
    managerIds: [managerAlpha._id],
    memberIds: [sophia._id, arjun._id],
  });

  logger.info('Created Users & Teams.');

  // 8. Create Sample Projects
  const now = new Date();

  // Developer Team Projects
  const projectFintech = await Project.create({
    name: 'Fintech Core Banking Migration',
    description: 'Migration of legacy settlement service to event-driven modular architecture.',
    client: 'Apex Financial',
    startDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    teamId: teamDeveloper._id,
    managerId: managerAlpha._id,
    status: PROJECT_STATUS.ACTIVE,
    createdBy: managerAlpha._id,
  });

  const projectCustomerPortal = await Project.create({
    name: 'Customer Portal 2.0 Web Platform',
    description: 'High-performance customer self-service portal with real-time websocket notifications.',
    client: 'Global Retail Inc.',
    startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
    teamId: teamDeveloper._id,
    managerId: managerAlpha._id,
    status: PROJECT_STATUS.ACTIVE,
    createdBy: managerAlpha._id,
  });

  // UI/UX Design Team Projects
  const projectDesignSystem = await Project.create({
    name: 'Mobile Design System & Brand Refresh',
    description: 'Unification of mobile UI components, responsive cards, and design tokens.',
    client: 'Lumina Health',
    startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000),
    teamId: teamUIUX._id,
    managerId: managerBeta._id,
    status: PROJECT_STATUS.ACTIVE,
    createdBy: managerBeta._id,
  });

  const projectAnalyticsDashboard = await Project.create({
    name: 'Enterprise Analytics Dashboard Redesign',
    description: 'Information-dense analytics interface adhering to editorial-minimal design principles.',
    client: 'Horizon Telemetry',
    startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000),
    teamId: teamUIUX._id,
    managerId: managerBeta._id,
    status: PROJECT_STATUS.ACTIVE,
    createdBy: managerBeta._id,
  });

  // QA & Testing Team Projects
  const projectTestAutomation = await Project.create({
    name: 'End-to-End Test Automation Framework',
    description: 'Comprehensive test suite covering authentication, RBAC, and workflow state transitions.',
    client: 'Apex Financial',
    startDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
    teamId: teamQA._id,
    managerId: managerAlpha._id,
    status: PROJECT_STATUS.ACTIVE,
    createdBy: managerAlpha._id,
  });

  const projectSecurityAudit = await Project.create({
    name: 'Security Vulnerability & Penetration Testing',
    description: 'Multi-vector security verification: magic-bytes verification, CSV formula injection, and IDOR defense.',
    client: 'SecurePay Gateway',
    startDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    teamId: teamQA._id,
    managerId: managerAlpha._id,
    status: PROJECT_STATUS.ACTIVE,
    createdBy: managerAlpha._id,
  });

  logger.info('Created Projects.');

  // 9. Create Sample Tasks across all Teams & Projects
  const tasksData = [
    // --- Developer Team Tasks (Fintech Core Banking Migration) ---
    {
      title: 'Implement OAuth 2.0 PKCE Flow',
      description: 'Strengthen client auth exchange with proof key for code exchange verification.',
      projectId: projectFintech._id,
      teamId: teamDeveloper._id,
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
      projectId: projectFintech._id,
      teamId: teamDeveloper._id,
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
      projectId: projectFintech._id,
      teamId: teamDeveloper._id,
      assigneeId: elena._id,
      status: TASK_STATUS.IN_REVIEW,
      priority: TASK_PRIORITY.URGENT,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      createdBy: managerAlpha._id,
      __v: 2,
    },
    {
      title: 'Setup Initial Docker Multi-Stage Builds',
      description: 'Containerize client and server builds with non-root security principles.',
      projectId: projectFintech._id,
      teamId: teamDeveloper._id,
      assigneeId: david._id,
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.MEDIUM,
      dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      createdBy: admin._id,
      __v: 3,
    },

    // --- Developer Team Tasks (Customer Portal 2.0 Web Platform) ---
    {
      title: 'Develop Real-Time WebSocket Notification Feed',
      description: 'Stream instant notifications and update unread notification badge using Socket.IO private rooms.',
      projectId: projectCustomerPortal._id,
      teamId: teamDeveloper._id,
      assigneeId: liam._id,
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.HIGH,
      dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      createdBy: managerAlpha._id,
      __v: 1,
    },
    {
      title: 'Implement CSV Export with Formula Injection Defense',
      description: 'Prefix vulnerable spreadsheet trigger characters (=, +, -, @) to neutralize malicious formulas.',
      projectId: projectCustomerPortal._id,
      teamId: teamDeveloper._id,
      assigneeId: priya._id,
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.MEDIUM,
      dueDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
      createdBy: managerAlpha._id,
      __v: 0,
    },

    // --- UI/UX Design Team Tasks (Mobile Design System) ---
    {
      title: 'User Persona Research & Accessibility Review',
      description: 'Conduct WCAG 2.1 AA audit on all core customer flows and design tokens.',
      projectId: projectDesignSystem._id,
      teamId: teamUIUX._id,
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
      projectId: projectDesignSystem._id,
      teamId: teamUIUX._id,
      assigneeId: maya._id,
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.MEDIUM,
      dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      createdBy: managerBeta._id,
      __v: 1,
    },
    {
      title: 'Mobile Responsive Navigation Prototype',
      description: 'Design collapsible sidebar drawer and tactile bottom sheet interactions.',
      projectId: projectDesignSystem._id,
      teamId: teamUIUX._id,
      assigneeId: lucas._id,
      status: TASK_STATUS.IN_REVIEW,
      priority: TASK_PRIORITY.MEDIUM,
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      createdBy: managerBeta._id,
      __v: 2,
    },
    {
      title: 'Brand Refresh Design Token Specifications',
      description: 'Define semantic color scales, tabular numeral typography, and 4px grid spacing tokens.',
      projectId: projectDesignSystem._id,
      teamId: teamUIUX._id,
      assigneeId: lucas._id,
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.LOW,
      dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      createdBy: managerBeta._id,
      __v: 3,
    },

    // --- QA & Testing Team Tasks (End-to-End Test Automation & Security) ---
    {
      title: 'Automate RBAC and Permission Regression Tests',
      description: 'Supertest automated validation for cross-team isolation and unassigned task IDOR prevention.',
      projectId: projectTestAutomation._id,
      teamId: teamQA._id,
      assigneeId: sophia._id,
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.HIGH,
      dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      createdBy: managerAlpha._id,
      __v: 1,
    },
    {
      title: 'API Integration Test Coverage for Task Workflows',
      description: 'Verify strict state transitions (TODO -> IN_PROGRESS -> IN_REVIEW -> DONE) and rejection reason validation.',
      projectId: projectTestAutomation._id,
      teamId: teamQA._id,
      assigneeId: sophia._id,
      status: TASK_STATUS.TODO,
      priority: TASK_PRIORITY.MEDIUM,
      dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      createdBy: managerAlpha._id,
      __v: 0,
    },
    {
      title: 'Verify Binary Magic-Bytes Attachment Defense',
      description: 'Test file upload rejection for disguised executables attempting to spoof file extensions.',
      projectId: projectSecurityAudit._id,
      teamId: teamQA._id,
      assigneeId: arjun._id,
      status: TASK_STATUS.IN_REVIEW,
      priority: TASK_PRIORITY.URGENT,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      createdBy: managerAlpha._id,
      __v: 2,
    },
    {
      title: 'Load Test Optimistic Concurrency Control (OCC)',
      description: 'Simulate concurrent task updates to verify version key (__v) collision detection and 409 responses.',
      projectId: projectSecurityAudit._id,
      teamId: teamQA._id,
      assigneeId: arjun._id,
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.HIGH,
      dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      createdBy: admin._id,
      __v: 3,
    },
  ];

  const tasks = await Task.insertMany(tasksData);

  // 10. Create Activities for seeded tasks
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

  console.log('\n========================================================================================');
  console.log(' SEEDING COMPLETED SUCCESSFULLY');
  console.log('========================================================================================');
  console.log('| Role     | Name            | Email                      | Password         | Team');
  console.log('|----------|-----------------|----------------------------|------------------|---------------------');
  console.log('| Admin    | Sarah Admin     | admin@actowiz.com          | AdminPass123!    | Global System Admin');
  console.log('| Manager  | Alex River      | manager.alpha@actowiz.com  | ManagerPass123!  | Developer & QA');
  console.log('| Manager  | Marcus Vance    | manager.beta@actowiz.com   | ManagerPass123!  | UI/UX Design');
  console.log('| Employee | Elena Rostova   | elena@actowiz.com          | EmployeePass123! | Developer Team');
  console.log('| Employee | David Kim       | david@actowiz.com          | EmployeePass123! | Developer Team');
  console.log('| Employee | Liam Chen       | liam@actowiz.com           | EmployeePass123! | Developer Team');
  console.log('| Employee | Priya Sharma    | priya@actowiz.com          | EmployeePass123! | Developer Team');
  console.log('| Employee | Maya Patel      | maya@actowiz.com           | EmployeePass123! | UI/UX Design Team');
  console.log('| Employee | Lucas Moreau    | lucas@actowiz.com          | EmployeePass123! | UI/UX Design Team');
  console.log('| Employee | Sophia Bennett  | sophia@actowiz.com         | EmployeePass123! | QA & Testing Team');
  console.log('| Employee | Arjun Nair      | arjun@actowiz.com          | EmployeePass123! | QA & Testing Team');
  console.log('========================================================================================\n');
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
