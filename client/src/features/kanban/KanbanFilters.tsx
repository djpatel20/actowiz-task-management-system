import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../projects/projectsApi.js';
import { TaskQueryParams } from '../tasks/tasksApi.js';
import { Search, Download, AlertCircle, Plus } from 'lucide-react';
import { UserRole, TaskPriority } from '../../types/index.js';

interface KanbanFiltersProps {
  filters: TaskQueryParams;
  onFilterChange: (newFilters: Partial<TaskQueryParams>) => void;
  onReset: () => void;
  onExportCsv: () => void;
  onOpenCreateModal?: () => void;
  userRole?: UserRole;
  isExporting?: boolean;
}

export const KanbanFilters: React.FC<KanbanFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  onExportCsv,
  onOpenCreateModal,
  userRole,
  isExporting,
}) => {
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.listProjects({ limit: 100 }),
  });

  const projects = projectsData?.projects || [];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 mb-6 shadow-acto-sm flex flex-wrap items-center justify-between gap-3 animate-fade-in">
      {/* Search Input */}
      <div className="flex items-center space-x-2 flex-1 min-w-[200px] max-w-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
            placeholder="Search tasks by title..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
          />
        </div>
      </div>

      {/* Select Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Project Select */}
        <select
          value={filters.projectId || ''}
          onChange={(e) => onFilterChange({ projectId: e.target.value || undefined })}
          className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Priority Select */}
        <select
          value={filters.priority || ''}
          onChange={(e) =>
            onFilterChange({ priority: (e.target.value as TaskPriority) || undefined })
          }
          className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        {/* Overdue Toggle */}
        <button
          type="button"
          onClick={() => onFilterChange({ overdue: !filters.overdue ? true : undefined })}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            filters.overdue
              ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626]'
              : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#5B616E] hover:text-[#1E1B26]'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
          <span>Overdue Only</span>
        </button>

        {/* Reset Filters button */}
        {(filters.search || filters.projectId || filters.priority || filters.overdue) && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-[#5B616E] hover:text-[#290660] underline ml-1 font-medium transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Action Buttons: Create Task & CSV Export */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onExportCsv}
          disabled={isExporting}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] text-xs font-semibold text-[#1E1B26] rounded-lg shadow-acto-sm active:scale-[0.98] transition-all disabled:opacity-50"
          title="Export tasks to CSV (sanitized against formula injection)"
        >
          <Download className="w-3.5 h-3.5 text-[#5B616E]" />
          <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>

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
  );
};
