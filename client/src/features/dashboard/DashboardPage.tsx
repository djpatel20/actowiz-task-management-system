import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from './dashboardApi.js';
import { useAuth } from '../auth/AuthContext.js';
import actowizLogo from '../../assets/actowiz-logo.png';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Kanban,
  ArrowRight,
  TrendingUp,
  FolderKanban,
  Building2,
  Calendar,
  UserCheck,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
  });

  const assignedTeam = stats?.myTeam || (user?.team ? { name: user.team.name, description: user.team.description } : null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header with Actowiz Logo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-[#E2E8F0] shadow-acto-sm">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] shrink-0">
            <img
              src={actowizLogo}
              alt="Actowiz - Appliance of Data & Insights"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#1E1B26]">
              Welcome back, {user?.name}
            </h1>
            <p className="text-xs text-[#5B616E] mt-1 font-sans">
              {user?.role === 'ADMIN'
                ? 'Company-wide operations, performance metrics, and compliance logs.'
                : assignedTeam
                ? `Assigned to team ${assignedTeam.name} • ${
                    user?.role === 'MANAGER'
                      ? 'Managing team deliverables and review approvals.'
                      : 'Working on assigned deliverables and deadlines.'
                  }`
                : 'No team currently assigned. An administrator will assign you to a functional unit.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all shrink-0 self-start sm:self-center"
        >
          <Kanban className="w-4 h-4 text-[#FF6B00]" />
          <span className="font-heading">Open Kanban Board</span>
        </button>
      </div>

      {/* Assigned Team Section */}
      {stats?.myTeam ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-acto-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4400CE] to-[#290660] flex items-center justify-center text-white shadow-acto-purple shrink-0">
                <Building2 className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-[#4400CE] bg-[#4400CE]/10 px-2 py-0.5 rounded uppercase font-heading">
                    Your Assigned Team
                  </span>
                  <h2 className="text-base font-bold font-heading text-[#1E1B26] truncate">
                    {stats.myTeam.name}
                  </h2>
                </div>
                <p className="text-xs text-[#5B616E] mt-0.5 line-clamp-1 font-sans">
                  {stats.myTeam.description || 'Assigned functional organizational unit'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
              {user?.role === 'MANAGER' && (
                <button
                  type="button"
                  onClick={() => navigate('/teams')}
                  className="text-xs font-semibold text-[#0071CE] hover:text-[#4400CE] flex items-center space-x-1 font-heading transition-colors"
                >
                  <span>Manage Team</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Team Details & Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
              <div className="flex items-center space-x-1.5 text-[11px] font-medium text-[#5B616E] mb-1">
                <UserCheck className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>
                  {stats.myTeam.managers && stats.myTeam.managers.length > 1 ? 'Managers' : 'Manager'}
                </span>
              </div>
              <div className="text-xs font-bold font-heading text-[#1E1B26] truncate">
                {stats.myTeam.managers && stats.myTeam.managers.length > 0
                  ? stats.myTeam.managers
                      .map((m) => (typeof m === 'object' && m ? (m as { name?: string }).name : ''))
                      .filter(Boolean)
                      .join(', ')
                  : stats.myTeam.managerId && typeof stats.myTeam.managerId === 'object'
                  ? (stats.myTeam.managerId as { name?: string }).name
                  : 'Unassigned'}
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
              <div className="flex items-center space-x-1.5 text-[11px] font-medium text-[#5B616E] mb-1">
                <Users className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Team Roster</span>
              </div>
              <div className="text-xs font-bold font-heading text-[#1E1B26]">
                {stats.myTeam.memberCount ?? 0} Members ({stats.myTeam.managerCount ?? 1} Mgr · {stats.myTeam.employeeCount ?? 0} Emp)
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
              <div className="flex items-center space-x-1.5 text-[11px] font-medium text-[#5B616E] mb-1">
                <FolderKanban className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Team Projects</span>
              </div>
              <div className="text-xs font-bold font-heading text-[#1E1B26]">
                {stats.myTeam.projectCount ?? 0} Projects
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
              <div className="flex items-center space-x-1.5 text-[11px] font-medium text-[#5B616E] mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Your Role</span>
              </div>
              <div className="text-xs font-bold font-heading text-[#4400CE] uppercase">
                {user?.role}
              </div>
            </div>
          </div>
        </div>
      ) : user?.role !== 'ADMIN' ? (
        <div className="bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-xl p-5 text-center">
          <Building2 className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
          <h3 className="text-xs font-bold font-heading text-[#1E1B26]">No Team Assigned</h3>
          <p className="text-[11px] text-[#5B616E] mt-1 max-w-md mx-auto">
            You are not currently assigned to a team. An administrator will assign you to your functional unit soon.
          </p>
        </div>
      ) : null}

      {/* Metrics Cards - 5 Key Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-acto-sm acto-card">
          <div className="flex items-center justify-between text-[#5B616E] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-heading">Open Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#0071CE]" />
            </div>
          </div>
          <div className="text-3xl font-bold font-heading text-[#1E1B26]">
            {isLoading ? '...' : stats?.openTasks ?? 0}
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-1 font-sans">To Do &amp; In Progress</div>
        </div>

        <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-acto-sm acto-card">
          <div className="flex items-center justify-between text-[#5B616E] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-heading">In Review</span>
            <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#FF6B00]" />
            </div>
          </div>
          <div className="text-3xl font-bold font-heading text-[#FF6B00]">
            {isLoading ? '...' : stats?.inReviewTasks ?? 0}
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-1 font-sans">Awaiting approval</div>
        </div>

        <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-acto-sm acto-card">
          <div className="flex items-center justify-between text-[#5B616E] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-heading">Overdue</span>
            <div className="w-8 h-8 rounded-lg bg-[#EF4444]/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            </div>
          </div>
          <div className="text-3xl font-bold font-heading text-[#EF4444]">
            {isLoading ? '...' : stats?.overdueTasks ?? 0}
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-1 font-sans">Past due date</div>
        </div>

        <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-acto-sm acto-card">
          <div className="flex items-center justify-between text-[#5B616E] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-heading">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            </div>
          </div>
          <div className="text-3xl font-bold font-heading text-[#10B981]">
            {isLoading ? '...' : stats?.completedTasks ?? 0}
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-1 font-sans">Done tasks</div>
        </div>

        <div className="p-5 bg-white border border-[#E2E8F0] rounded-xl shadow-acto-sm acto-card col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#5B616E] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-heading">Projects</span>
            <div className="w-8 h-8 rounded-lg bg-[#4400CE]/10 flex items-center justify-center">
              <FolderKanban className="w-4 h-4 text-[#4400CE]" />
            </div>
          </div>
          <div className="text-3xl font-bold font-heading text-[#4400CE]">
            {isLoading ? '...' : stats?.totalProjects ?? 0}
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-1 font-sans">In your scope</div>
        </div>
      </div>

      {/* Main Content Grid: Recent Tasks & Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks List */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-acto-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold font-heading text-[#1E1B26]">Recent Tasks</h2>
                <p className="text-xs text-[#5B616E]">Latest updated work in your scope</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="text-xs font-semibold text-[#0071CE] hover:text-[#4400CE] flex items-center space-x-1 font-heading transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {!stats?.recentTasks || stats.recentTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#94A3B8]">No recent tasks found.</div>
              ) : (
                stats.recentTasks.map((t) => {
                  const proj = t.projectId as { name?: string };
                  const assignee = t.assigneeId as { name?: string };
                  return (
                    <div
                      key={t._id}
                      onClick={() => navigate(`/tasks?selected=${t._id}`)}
                      className="py-3 flex items-center justify-between hover:bg-[#F8FAFC] px-2 rounded-lg cursor-pointer transition-colors group"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="text-xs font-semibold text-[#1E1B26] group-hover:text-[#4400CE] transition-colors truncate font-sans">
                          {t.title}
                        </div>
                        <div className="text-[11px] text-[#5B616E] mt-0.5">
                          {proj?.name || 'Project'} &bull; Assigned to {assignee?.name || 'Unassigned'}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase text-[#4400CE] bg-[#4400CE]/10 border-[#4400CE]/20">
                          {t.status.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-[#94A3B8] hidden sm:inline">
                          {t.dueDate ? format(new Date(t.dueDate), 'MMM d') : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Active Projects List */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-acto-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold font-heading text-[#1E1B26]">Active Projects</h2>
                <p className="text-xs text-[#5B616E]">Engagements in your team / manager scope</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="text-xs font-semibold text-[#0071CE] hover:text-[#4400CE] flex items-center space-x-1 font-heading transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {!stats?.recentProjects || stats.recentProjects.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#94A3B8]">No projects found in your scope.</div>
              ) : (
                stats.recentProjects.map((p) => {
                  const team = p.teamId as { name?: string };
                  const mgr = p.managerId as { name?: string; email?: string } | null;
                  return (
                    <div
                      key={p._id}
                      onClick={() => navigate('/projects')}
                      className="py-3 flex items-center justify-between hover:bg-[#F8FAFC] px-2 rounded-lg cursor-pointer transition-colors group"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-[10px] font-bold text-[#4400CE] bg-[#4400CE]/10 px-1.5 py-0.5 rounded uppercase font-heading">
                            {p.client}
                          </span>
                          <span className="text-xs font-semibold text-[#1E1B26] group-hover:text-[#4400CE] transition-colors truncate font-sans">
                            {p.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-[11px] text-[#5B616E]">
                          <span className="flex items-center space-x-1">
                            <Building2 className="w-3 h-3 text-[#94A3B8]" />
                            <span>{team?.name || 'Team'}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <UserCheck className="w-3 h-3 text-[#94A3B8]" />
                            <span>{mgr?.name || 'Unassigned'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 text-[11px] text-[#94A3B8]">
                        <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>
                          {p.endDate ? format(new Date(p.endDate), 'MMM d, yyyy') : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
