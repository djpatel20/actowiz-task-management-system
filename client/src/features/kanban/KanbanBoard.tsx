import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { tasksApi, TaskQueryParams } from '../tasks/tasksApi.js';
import { KanbanColumn } from './KanbanColumn.js';
import { KanbanCard } from './KanbanCard.js';
import { KanbanFilters } from './KanbanFilters.js';
import { RejectionModal } from './RejectionModal.js';
import { CreateTaskModal } from './CreateTaskModal.js';
import { TaskDetailsDrawer } from '../tasks/TaskDetailsDrawer.js';
import { useAuth } from '../auth/AuthContext.js';
import { Task, TaskStatus } from '../../types/index.js';
import { getSocket } from '../../lib/socket.js';
import { AlertCircle } from 'lucide-react';

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'IN_REVIEW', title: 'In Review' },
  { id: 'DONE', title: 'Done' },
];

export const KanbanBoard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state
  const [filters, setFilters] = useState<TaskQueryParams>({
    projectId: searchParams.get('projectId') || undefined,
    priority: (searchParams.get('priority') as TaskQueryParams['priority']) || undefined,
    overdue: searchParams.get('overdue') === 'true' || undefined,
    search: searchParams.get('search') || undefined,
  });

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
    queryFn: () => tasksApi.listTasks({ ...filters, limit: 100 }),
  });

  const tasks = data?.tasks || [];

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
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Transition failed. Reverting changes.';
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

    // Terminal DONE protection
    if (task.status === 'DONE') {
      setErrorMessage('Completed tasks are strictly terminal and cannot be moved.');
      return;
    }

    // Role-based client validation
    if (user?.role === 'EMPLOYEE') {
      if (targetStatus === 'DONE') {
        setErrorMessage('Employees do not have review authority to mark tasks DONE.');
        return;
      }
      if (
        (task.status === 'IN_PROGRESS' && targetStatus === 'TODO') ||
        (task.status === 'IN_REVIEW' && targetStatus !== 'IN_REVIEW')
      ) {
        setErrorMessage('Employees cannot move tasks backwards in the workflow.');
        return;
      }
    }

    // Review rejection requires modal for mandatory reason
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
    setFilters(merged);
    const params = new URLSearchParams();
    if (merged.projectId) params.set('projectId', merged.projectId);
    if (merged.priority) params.set('priority', merged.priority);
    if (merged.overdue) params.set('overdue', 'true');
    if (merged.search) params.set('search', merged.search);
    if (selectedTaskId) params.set('selected', selectedTaskId);
    setSearchParams(params);
  };

  const resetFilters = () => {
    setFilters({});
    setSearchParams(selectedTaskId ? { selected: selectedTaskId } : {});
  };

  const openTaskDrawer = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('selected', id);
    setSearchParams(params);
  };

  const closeTaskDrawer = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('selected');
    setSearchParams(params);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1E1B26]">Workflow Kanban Board</h1>
          <p className="text-xs text-[#5B616E] mt-1 font-sans">
            Strict status lifecycle with optimistic concurrency and atomic transaction logs.
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
      />

      {/* DnD Kanban Columns */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-4 overflow-x-auto pb-6">
          {COLUMNS.map((col) => {
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
                    onClick={() => openTaskDrawer(task._id)}
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
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
      <TaskDetailsDrawer
        taskId={selectedTaskId}
        onClose={closeTaskDrawer}
        userRole={user?.role}
        currentUserId={user?.id}
      />
    </div>
  );
};
