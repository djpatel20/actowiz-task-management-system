import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { projectsApi } from '../projects/projectsApi.js';
import { TaskQueryParams } from '../tasks/tasksApi.js';
import { Search, Download, AlertCircle, Plus, Calendar, LayoutGrid, List, User as UserIcon } from 'lucide-react';
import { UserRole, TaskPriority, TaskStatus } from '../../types/index.js';

interface KanbanFiltersProps {
  filters: TaskQueryParams;
  onFilterChange: (newFilters: Partial<TaskQueryParams>) => void;
  onReset: () => void;
  onExportCsv: () => void;
  onOpenCreateModal?: () => void;
  userRole?: UserRole;
  isExporting?: boolean;
  availableAssignees?: { _id: string; name: string }[];
  viewMode: 'board' | 'table';
  onViewModeChange: (mode: 'board' | 'table') => void;
}

export const KanbanFilters: React.FC<KanbanFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  onExportCsv,
  onOpenCreateModal,
  userRole,
  isExporting,
  availableAssignees = [],
  viewMode,
  onViewModeChange,
}) => {
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.listProjects({ limit: 100 }),
  });

  const projects = projectsData?.projects || [];
  const todayString = format(new Date(), 'yyyy-MM-dd');

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.projectId ||
    filters.status ||
    filters.priority ||
    filters.assigneeId ||
    filters.dueDate ||
    filters.overdue
  );

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 mb-6 shadow-acto-sm space-y-3 animate-fade-in">
      {/* Top Row: Search, View Mode Toggle, and Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex items-center space-x-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
              placeholder="Search tasks by title or description..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all font-sans"
            />
          </div>
        </div>

        {/* View Switcher and Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* View Toggle */}
          <div className="flex items-center bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange('board')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'board'
                  ? 'bg-white text-[#4400CE] shadow-2xs'
                  : 'text-[#5B616E] hover:text-[#1E1B26]'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-heading">Board</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-[#4400CE] shadow-2xs'
                  : 'text-[#5B616E] hover:text-[#1E1B26]'
              }`}
              title="Table List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-heading">List</span>
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={onExportCsv}
            disabled={isExporting}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] text-xs font-semibold text-[#1E1B26] rounded-lg shadow-acto-sm active:scale-[0.98] transition-all disabled:opacity-50"
            title="Export tasks to CSV (sanitized against formula injection)"
          >
            <Download className="w-3.5 h-3.5 text-[#5B616E]" />
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          {/* Create Task Button for Manager/Admin */}
          {(userRole === 'ADMIN' || userRole === 'MANAGER') && onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span className="font-heading">New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Multi-Filter Controls (Status, Priority, Assignee, Project, Due Date, Overdue) */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#F1F5F9]">
        {/* Project Filter */}
        <select
          value={filters.projectId || ''}
          onChange={(e) => onFilterChange({ projectId: e.target.value || undefined })}
          className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all font-sans"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filters.status || ''}
          onChange={(e) =>
            onFilterChange({ status: (e.target.value as TaskStatus) || undefined })
          }
          className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all font-sans"
        >
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
        </select>

        {/* Priority Filter */}
        <select
          value={filters.priority || ''}
          onChange={(e) =>
            onFilterChange({ priority: (e.target.value as TaskPriority) || undefined })
          }
          className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all font-sans"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        {/* Assignee Filter (for Admin / Manager) */}
        {userRole !== 'EMPLOYEE' && availableAssignees.length > 0 && (
          <div className="relative flex items-center">
            <select
              value={filters.assigneeId || ''}
              onChange={(e) => onFilterChange({ assigneeId: e.target.value || undefined })}
              className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all font-sans"
            >
              <option value="">All Assignees</option>
              {availableAssignees.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Due Date Filter */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#5B616E]">
          <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
          <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Due:</span>
          <input
            type="date"
            min={todayString}
            value={filters.dueDate || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val && val < todayString) return;
              onFilterChange({ dueDate: val || undefined });
            }}
            className="bg-transparent text-xs text-[#1E1B26] focus:outline-none font-sans"
            title="Filter by exact due date"
          />
        </div>

        {/* Overdue Toggle */}
        <button
          type="button"
          onClick={() => onFilterChange({ overdue: !filters.overdue ? true : undefined })}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            filters.overdue
              ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626] shadow-2xs'
              : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#5B616E] hover:text-[#1E1B26]'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
          <span>Overdue Only</span>
        </button>

        {/* Clear Filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-[#5B616E] hover:text-[#290660] underline ml-1 font-medium transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};
