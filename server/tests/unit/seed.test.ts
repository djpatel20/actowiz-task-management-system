import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initTestDatabase, closeTestDatabase } from '../setup.js';
import { seedDatabase } from '../../scripts/seed.js';
import { User } from '../../src/modules/users/user.model.js';
import { Team } from '../../src/modules/teams/team.model.js';
import { Project } from '../../src/modules/projects/project.model.js';
import { Task } from '../../src/modules/tasks/task.model.js';
import { Activity } from '../../src/modules/activity/activity.model.js';
import { USER_ROLES } from '../../src/config/constants.js';

describe('Seed Script Verification', () => {
  beforeAll(async () => {
    await initTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it('seedDatabase creates 1 Admin, 2 Managers, 3 Employees, 2 Teams, Projects, and Tasks with Activities', async () => {
    await seedDatabase();

    const [users, teams, projects, tasks, activities] = await Promise.all([
      User.find().lean(),
      Team.find().lean(),
      Project.find().lean(),
      Task.find().lean(),
      Activity.find().lean(),
    ]);

    expect(users.length).toBe(6);
    expect(teams.length).toBe(2);
    expect(projects.length).toBe(2);
    expect(tasks.length).toBe(6);
    expect(activities.length).toBeGreaterThanOrEqual(6);

    const admin = users.find((u) => u.email === 'admin@actowiz.com');
    expect(admin).toBeDefined();
    expect(admin?.role).toBe(USER_ROLES.ADMIN);

    const managerAlpha = users.find((u) => u.email === 'manager.alpha@actowiz.com');
    expect(managerAlpha).toBeDefined();
    expect(managerAlpha?.role).toBe(USER_ROLES.MANAGER);

    const managerBeta = users.find((u) => u.email === 'manager.beta@actowiz.com');
    expect(managerBeta).toBeDefined();
    expect(managerBeta?.role).toBe(USER_ROLES.MANAGER);

    const elena = users.find((u) => u.email === 'elena@actowiz.com');
    const david = users.find((u) => u.email === 'david@actowiz.com');
    const maya = users.find((u) => u.email === 'maya@actowiz.com');
    expect(elena?.role).toBe(USER_ROLES.EMPLOYEE);
    expect(david?.role).toBe(USER_ROLES.EMPLOYEE);
    expect(maya?.role).toBe(USER_ROLES.EMPLOYEE);

    const teamAlpha = teams.find((t) => t.name === 'Team Alpha');
    const teamBeta = teams.find((t) => t.name === 'Team Beta');
    expect(teamAlpha?.managerId?.toString()).toBe(managerAlpha?._id.toString());
    expect(teamBeta?.managerId?.toString()).toBe(managerBeta?._id.toString());
  });
});
