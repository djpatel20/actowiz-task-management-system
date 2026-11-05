import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { tasksApi, TaskQueryParams } from '../tasks/tasksApi.js';
import { useAuth } from '../auth/AuthContext.js';
import { Task, TaskStatus, TaskPriority } from '../../types/index.js';
import { KanbanColumn } from './KanbanColumn.js';
import { KanbanCard } from './KanbanCard.js';
import { KanbanFilters } from './KanbanFilters.js';
import { RejectionModal } from './RejectionModal.js';
import { CreateTaskModal } from './CreateTaskModal.js';
import { TaskDetailsDrawer } from '../tasks/TaskDetailsDrawer.js';
import { getSocket } from '../../lib/socket.js';
import { AlertCircle, ChevronLeft, ChevronRight, Calendar, AlertTriangle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { getApiErrorMessage } from '../../lib/errors.js';

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'IN_REVIEW', title: 'In Review' },
  { id: 'DONE', title: 'Done' },
];

const safeFormatDate = (date: unknown, formatStr: string, fallback = 'N/A'): string => {
  if (!date) return fallback;
  try {
    const d = new Date(date as string | number | Date);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
};

export const KanbanBoard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state with full query support & pagination
  const [filters, setFilters] = useState<TaskQueryParams>({
    projectId: searchParams.get('projectId') || undefined,
    status: (searchParams.get('status') as TaskQueryParams['status']) || undefined,
    priority: (searchParams.get('priority') as TaskQueryParams['priority']) || undefined,
    assigneeId: searchParams.get('assigneeId') || undefined,
    dueDate: searchParams.get('dueDate') || undefined,
    overdue: searchParams.get('overdue') === 'true' || undefined,
    search: searchParams.get('search') || undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
  });

  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

  // Selected task for drawer
  const selectedTaskId = searchParams.get('selected');

  // Modals state
  const [rejectionTarget, setRejectionTarget] = useState<{
    task: Task;
    targetStatus: TaskStatus;
  } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Fetch tasks
  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.listTasks(filters),
  });

  const tasks = data?.tasks || [];
  const totalTasks = data?.total ?? tasks.length;
  const currentPage = filters.page || 1;
  const pageSize = filters.limit || 50;
  const totalPages = Math.max(1, Math.ceil(totalTasks / pageSize));

  // Extract unique assignees from loaded tasks
  const availableAssignees = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => {
      const a = t.assigneeId as { _id?: string; name?: string } | undefined;
      if (a?._id && a?.name) {
        map.set(a._id, a.name);
      }
    });
    return Array.from(map.entries()).map(([_id, name]) => ({ _id, name }));
  }, [tasks]);

  // Real-time socket sync
  useEffect(() => {
    const socket = getSocket();

    const handleTaskUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    socket.on('task:status_changed', handleTaskUpdate);
    socket.on('task:assigned', handleTaskUpdate);

    return () => {
      socket.off('task:status_changed', handleTaskUpdate);
      socket.off('task:assigned', handleTaskUpdate);
    };
  }, [queryClient]);

  // Status transition mutation with Optimistic Updates & Rollback
  const transitionMutation = useMutation({
    mutationFn: (variables: {
      taskId: string;
      targetStatus: TaskStatus;
      version: number;
      rejectionReason?: string;
    }) =>
      tasksApi.transitionStatus(variables.taskId, {
        status: variables.targetStatus,
        version: variables.version,
        rejectionReason: variables.rejectionReason,
      }),
    onMutate: async (variables) => {
      setErrorMessage(null);
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks', filters]);

      queryClient.setQueryData(
        ['tasks', filters],
        (old: { tasks: Task[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            tasks: old.tasks.map((t) =>
              t._id === variables.taskId
                ? {
                    ...t,
                    status: variables.targetStatus,
                    __v: t.__v + 1,
                    completedAt:
                      variables.targetStatus === 'DONE'
                        ? new Date().toISOString()
                        : t.completedAt,
                  }
                : t
            ),
          };
        }
      );

      return { previousTasks };
    },
    onError: (err: unknown, _variables, context) => {
      // Auto-rollback
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', filters], context.previousTasks);
      }
      const msg = getApiErrorMessage(err, 'Transition failed. Reverting changes.');
      setErrorMessage(msg);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: Parameters<typeof tasksApi.createTask>[0]) => tasksApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Handle Drag Start
  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task;
    setActiveTask(task || null);
  };

  // Validate and handle Drag End
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = active.data.current?.task as Task;
    const targetStatus = over.id as TaskStatus;

    if (!task || task.status === targetStatus) return;

    // Terminal DONE check
    if (task.status === 'DONE') {
      setErrorMessage('Tasks marked DONE are permanently completed (terminal).');
      return;
    }

    // Role-based Transition validation
    if (user?.role === 'EMPLOYEE') {
      const isValidEmployeeTransition =
        (task.status === 'TODO' && targetStatus === 'IN_PROGRESS') ||
        (task.status === 'IN_PROGRESS' && targetStatus === 'IN_REVIEW');

      if (!isValidEmployeeTransition) {
        if (targetStatus === 'DONE') {
          setErrorMessage('Employees cannot mark tasks as DONE. Submit for review first.');
        } else {
          setErrorMessage('Invalid transition. Employees can only advance TODO -> IN PROGRESS -> IN REVIEW.');
        }
        return;
      }
    }

    // Manager / Admin review rejection validation
    if (task.status === 'IN_REVIEW' && targetStatus === 'IN_PROGRESS') {
      setRejectionTarget({ task, targetStatus });
      return;
    }

    // Normal progression execution
    transitionMutation.mutate({
      taskId: task._id,
      targetStatus,
      version: task.__v,
    });
  };

  // Handle Rejection Submit
  const handleRejectionSubmit = (reason: string) => {
    if (!rejectionTarget) return;
    transitionMutation.mutate({
      taskId: rejectionTarget.task._id,
      targetStatus: rejectionTarget.targetStatus,
      version: rejectionTarget.task.__v,
      rejectionReason: reason,
    });
    setRejectionTarget(null);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await tasksApi.exportCsv(filters);
    } catch {
      setErrorMessage('Failed to export tasks CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const updateFilters = (newFilters: Partial<TaskQueryParams>) => {
    const merged = { ...filters, ...newFilters };
    if (newFilters.page === undefined && (newFilters.search !== undefined || newFilters.projectId !== undefined || newFilters.status !== undefined || newFilters.priority !== undefined || newFilters.assigneeId !== undefined || newFilters.dueDate !== undefined || newFilters.overdue !== undefined)) {
      merged.page = 1;
    }
    setFilters(merged);
    const params = new URLSearchParams();
    if (merged.projectId) params.set('projectId', merged.projectId);
    if (merged.status) params.set('status', merged.status);
    if (merged.priority) params.set('priority', merged.priority);
    if (merged.assigneeId) params.set('assigneeId', merged.assigneeId);
    if (merged.dueDate) params.set('dueDate', merged.dueDate);
    if (merged.overdue) params.set('overdue', 'true');
    if (merged.search) params.set('search', merged.search);
    if (merged.page && merged.page > 1) params.set('page', merged.page.toString());
    if (merged.limit && merged.limit !== 50) params.set('limit', merged.limit.toString());
    if (selectedTaskId) params.set('selected', selectedTaskId);
    setSearchParams(params);
  };

  const resetFilters = () => {
    setFilters({ page: 1, limit: 50 });
    setSearchParams(selectedTaskId ? { selected: selectedTaskId } : {});
  };

  const openTaskDrawer = (task: Task) => {
    queryClient.setQueryData(['task', task._id], task);
    const params = new URLSearchParams(searchParams);
    params.set('selected', task._id);
    setSearchParams(params);
  };

  const closeTaskDrawer = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('selected');
    setSearchParams(params);
  };

  // Filter columns if status filter is applied in board view
  const visibleColumns = filters.status
    ? COLUMNS.filter((col) => col.id === filters.status)
    : COLUMNS;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1E1B26]">Tasks Management</h1>
          <p className="text-xs text-[#5B616E] mt-1 font-sans">
            Strict status lifecycle with optimistic concurrency, role-based workflows, and real-time activity tracking.
          </p>
        </div>
      </div>

      {/* Error Alert with auto-rollback notification */}
      {errorMessage && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] rounded-xl text-xs flex items-center justify-between shadow-acto-sm animate-pop-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold underline hover:text-[#B91C1C]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <KanbanFilters
        filters={filters}
        onFilterChange={updateFilters}
        onReset={resetFilters}
        onExportCsv={handleExportCsv}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        userRole={user?.role}
        isExporting={isExporting}
        availableAssignees={availableAssignees}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content: Board View vs Table List View */}
      {viewMode === 'board' ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {visibleColumns.map((col) => {
              const columnTasks = tasks.filter((t) => t.status === col.id);
              return (
                <KanbanColumn
                  key={col.id}
                  status={col.id}
                  title={col.title}
                  count={columnTasks.length}
                >
                  {columnTasks.map((task: Task) => (
                    <KanbanCard
                      key={task._id}
                      task={task}
                      userRole={user?.role}
                      currentUserId={user?.id}
                      onClick={() => openTaskDrawer(task)}
                      onQuickTransition={(t: Task, targetStatus: TaskStatus) => {
                        if (t.status === 'IN_REVIEW' && targetStatus === 'IN_PROGRESS') {
                          setRejectionTarget({ task: t, targetStatus });
                        } else {
                          transitionMutation.mutate({
                            taskId: t._id,
                            targetStatus,
                            version: t.__v,
                          });
                        }
                      }}
                    />
                  ))}
                </KanbanColumn>
              );
            })}
          </div>

          {/* Drag Overlay for smooth card movement */}
          <DragOverlay>
            {activeTask ? (
              <div className="w-[280px]">
                <KanbanCard
                  task={activeTask}
                  userRole={user?.role}
                  currentUserId={user?.id}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* Table List View */
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#5B616E] font-heading uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                      Loading tasks...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const project = task.projectId as { name?: string };
                    const assignee = task.assigneeId as { name?: string };
                    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                    const isDateValid = dueDate && !isNaN(dueDate.getTime());
                    const isOverdue = isDateValid && isPast(dueDate) && !isToday(dueDate) && task.status !== 'DONE';

                    return (
                      <tr
                        key={task._id}
                        onClick={() => openTaskDrawer(task)}
                        className={`hover:bg-[#F8FAFC] cursor-pointer transition-colors ${
                          isOverdue ? 'bg-[#FEF2F2]/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#1E1B26] hover:text-[#4400CE] transition-colors truncate max-w-xs font-sans">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-[11px] text-[#5B616E] line-clamp-1 truncate max-w-xs">
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#5B616E] font-heading font-medium">
                          {project?.name || 'No Project'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#4400CE] to-[#290660] text-white text-[9px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                              {assignee?.name?.charAt(0) || 'U'}
                            </div>
                            <span className="truncate max-w-[120px] font-medium text-[#1E1B26]">
                              {assignee?.name || 'Unassigned'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                              task.priority === 'URGENT'
                                ? 'text-[#DC2626] bg-[#FEF2F2] border-[#FCA5A5]'
                                : task.priority === 'HIGH'
                                ? 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]'
                                : task.priority === 'MEDIUM'
                                ? 'text-[#0071CE] bg-[#F0F7FF] border-[#BAE6FD]'
                                : 'text-[#64748B] bg-[#F8FAFC] border-[#E2E8F0]'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isOverdue ? (
                            <span className="flex items-center space-x-1 text-[#DC2626] font-bold">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Overdue ({safeFormatDate(task.dueDate, 'MMM d')})</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-[#64748B]">
                              <Calendar className="w-3 h-3 text-[#94A3B8] shrink-0" />
                              <span>{safeFormatDate(task.dueDate, 'MMM d', 'No deadline')}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase text-[#4400CE] bg-[#4400CE]/10 border-[#4400CE]/20 font-heading">
                            {task.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openTaskDrawer(task)}
                            className="text-xs font-semibold text-[#0071CE] hover:text-[#4400CE] hover:underline"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-[#5B616E]">
        <div className="flex items-center space-x-2">
          <span>
            Showing {totalTasks === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalTasks)} of {totalTasks} tasks
          </span>
          <div className="flex items-center space-x-1 ml-2">
            <span className="text-[11px] text-[#94A3B8]">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => updateFilters({ limit: parseInt(e.target.value, 10), page: 1 })}
              className="px-2 py-0.5 bg-white border border-[#E2E8F0] rounded text-xs text-[#1E1B26] focus:outline-none focus:ring-1 focus:ring-[#290660]"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => updateFilters({ page: currentPage - 1 })}
            disabled={currentPage <= 1}
            className="flex items-center space-x-1 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <span className="px-2 py-1 text-xs font-semibold text-[#1E1B26]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => updateFilters({ page: currentPage + 1 })}
            disabled={currentPage >= totalPages}
            className="flex items-center space-x-1 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rejection Modal for Mandatory Reason */}
      <RejectionModal
        task={rejectionTarget?.task || null}
        isOpen={!!rejectionTarget}
        onClose={() => setRejectionTarget(null)}
        onSubmit={handleRejectionSubmit}
        isSubmitting={transitionMutation.isPending}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (newTask) => {
          await createTaskMutation.mutateAsync(newTask);
        }}
        userTeamId={user?.teamId}
      />

      {/* Task Details Drawer */}
      {selectedTaskId && (
        <TaskDetailsDrawer
          taskId={selectedTaskId}
          onClose={closeTaskDrawer}
          userRole={user?.role}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
};
