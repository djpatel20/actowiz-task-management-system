import React from 'react';
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
} from 'lucide-react';
import { format } from 'date-fns';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
  });

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
                : user?.role === 'MANAGER'
                ? `Managing team projects and review approvals for ${user?.team?.name || 'your team'}.`
                : 'Your active assignments, reviews, and delivery deadlines.'}
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="text-[11px] text-[#94A3B8] mt-1 font-sans">Awaiting review approval</div>
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
          <div className="text-[11px] text-[#94A3B8] mt-1 font-sans">Requires immediate attention</div>
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
          <div className="text-[11px] text-[#94A3B8] mt-1 font-sans">Terminal Done tasks</div>
        </div>
      </div>

      {/* Recent Tasks List */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-acto-sm">
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
                  className="py-3.5 flex items-center justify-between hover:bg-[#F8FAFC] px-3 rounded-lg cursor-pointer transition-colors group"
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
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase text-[#4400CE] bg-[#4400CE]/10 border-[#4400CE]/20">
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
  );
};
