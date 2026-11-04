import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from './dashboardApi.js';
import { useAuth } from '../auth/AuthContext.js';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#252824]">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-[#777B76] mt-0.5">
            {user?.role === 'ADMIN'
              ? 'Company-wide operations, performance metrics, and compliance logs.'
              : user?.role === 'MANAGER'
              ? `Managing team projects and review approvals for ${user?.team?.name || 'your team'}.`
              : 'Your active assignments, reviews, and delivery deadlines.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#5556A6] hover:bg-[#45468F] text-white text-xs font-medium rounded-lg transition-colors shrink-0"
        >
          <Kanban className="w-4 h-4" />
          <span>Open Kanban Board</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#E5E6E1] rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-[#777B76] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Open Tasks</span>
            <Clock className="w-4 h-4 text-[#547DA6]" />
          </div>
          <div className="text-2xl font-bold text-[#252824]">
            {isLoading ? '...' : stats?.openTasks ?? 0}
          </div>
          <div className="text-[11px] text-[#969A94] mt-1">To Do &amp; In Progress</div>
        </div>

        <div className="p-4 bg-white border border-[#E5E6E1] rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-[#777B76] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">In Review</span>
            <TrendingUp className="w-4 h-4 text-[#B9843D]" />
          </div>
          <div className="text-2xl font-bold text-[#252824]">
            {isLoading ? '...' : stats?.inReviewTasks ?? 0}
          </div>
          <div className="text-[11px] text-[#969A94] mt-1">Awaiting review approval</div>
        </div>

        <div className="p-4 bg-white border border-[#E5E6E1] rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-[#777B76] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-[#C35D5D]" />
          </div>
          <div className="text-2xl font-bold text-[#C35D5D]">
            {isLoading ? '...' : stats?.overdueTasks ?? 0}
          </div>
          <div className="text-[11px] text-[#969A94] mt-1">Requires immediate attention</div>
        </div>

        <div className="p-4 bg-white border border-[#E5E6E1] rounded-lg shadow-xs">
          <div className="flex items-center justify-between text-[#777B76] mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-[#438568]" />
          </div>
          <div className="text-2xl font-bold text-[#252824]">
            {isLoading ? '...' : stats?.completedTasks ?? 0}
          </div>
          <div className="text-[11px] text-[#969A94] mt-1">Terminal Done tasks</div>
        </div>
      </div>

      {/* Recent Tasks List */}
      <div className="bg-white border border-[#E5E6E1] rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#252824]">Recent Tasks</h2>
            <p className="text-xs text-[#777B76]">Latest updated work in your scope</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="text-xs font-medium text-[#5556A6] hover:text-[#45468F] flex items-center space-x-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-[#E5E6E1]">
          {!stats?.recentTasks || stats.recentTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#969A94]">No recent tasks found.</div>
          ) : (
            stats.recentTasks.map((t) => {
              const proj = t.projectId as { name?: string };
              const assignee = t.assigneeId as { name?: string };
              return (
                <div
                  key={t._id}
                  onClick={() => navigate(`/tasks?selected=${t._id}`)}
                  className="py-3 flex items-center justify-between hover:bg-[#F7F7F4] px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-4">
                    <div className="text-xs font-semibold text-[#252824] truncate">{t.title}</div>
                    <div className="text-[11px] text-[#777B76] mt-0.5">
                      {proj?.name || 'Project'} &bull; Assigned to {assignee?.name || 'Unassigned'}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded border uppercase text-[#777B76] bg-[#F0F0EC] border-[#E5E6E1]">
                      {t.status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-[#969A94] hidden sm:inline">
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
