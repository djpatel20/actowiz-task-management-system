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

  it('seedDatabase creates 1 Admin, 2 Managers, 8 Employees, 3 Teams, 6 Projects, and 14 Tasks with Activities', async () => {
    await seedDatabase();

    const [users, teams, projects, tasks, activities] = await Promise.all([
      User.find().lean(),
      Team.find().lean(),
      Project.find().lean(),
      Task.find().lean(),
      Activity.find().lean(),
    ]);

    expect(users.length).toBe(11);
    expect(teams.length).toBe(3);
    expect(projects.length).toBe(6);
    expect(tasks.length).toBe(14);
    expect(activities.length).toBeGreaterThanOrEqual(14);

    const admin = users.find((u) => u.email === 'admin@actowiz.com');
    expect(admin).toBeDefined();
    expect(admin?.role).toBe(USER_ROLES.ADMIN);

    const managerAlpha = users.find((u) => u.email === 'manager.alpha@actowiz.com');
    expect(managerAlpha).toBeDefined();
    expect(managerAlpha?.role).toBe(USER_ROLES.MANAGER);

    const managerBeta = users.find((u) => u.email === 'manager.beta@actowiz.com');
    expect(managerBeta).toBeDefined();
    expect(managerBeta?.role).toBe(USER_ROLES.MANAGER);

    // Verify Developer team employees
    const elena = users.find((u) => u.email === 'elena@actowiz.com');
    const david = users.find((u) => u.email === 'david@actowiz.com');
    const liam = users.find((u) => u.email === 'liam@actowiz.com');
    const priya = users.find((u) => u.email === 'priya@actowiz.com');
    expect(elena?.role).toBe(USER_ROLES.EMPLOYEE);
    expect(david?.role).toBe(USER_ROLES.EMPLOYEE);
    expect(liam?.role).toBe(USER_ROLES.EMPLOYEE);
    expect(priya?.role).toBe(USER_ROLES.EMPLOYEE);

    // Verify UI/UX team employees
    const maya = users.find((u) => u.email === 'maya@actowiz.com');
    const lucas = users.find((u) => u.email === 'lucas@actowiz.com');
    expect(maya?.role).toBe(USER_ROLES.EMPLOYEE);
    expect(lucas?.role).toBe(USER_ROLES.EMPLOYEE);

    // Verify QA team employees
    const sophia = users.find((u) => u.email === 'sophia@actowiz.com');
    const arjun = users.find((u) => u.email === 'arjun@actowiz.com');
    expect(sophia?.role).toBe(USER_ROLES.EMPLOYEE);
    expect(arjun?.role).toBe(USER_ROLES.EMPLOYEE);

    // Verify teams and managers
    const teamDeveloper = teams.find((t) => t.name === 'Developer Team');
    const teamUIUX = teams.find((t) => t.name === 'UI/UX Design Team');
    const teamQA = teams.find((t) => t.name === 'QA & Testing Team');

    expect(teamDeveloper?.managerId?.toString()).toBe(managerAlpha?._id.toString());
    expect(teamUIUX?.managerId?.toString()).toBe(managerBeta?._id.toString());
    expect(teamQA?.managerId?.toString()).toBe(managerAlpha?._id.toString());
  });
});
