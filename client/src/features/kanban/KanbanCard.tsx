import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Task, TaskPriority, TaskStatus, UserRole } from '../../types/index.js';
import { Calendar, AlertCircle, MoreVertical } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

interface KanbanCardProps {
  task: Task;
  userRole?: UserRole;
  currentUserId?: string;
  onClick: () => void;
  onQuickTransition?: (task: Task, targetStatus: TaskStatus) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  userRole,
  currentUserId,
  onClick,
  onQuickTransition,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: { task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate ? isPast(dueDate) && !isToday(dueDate) && task.status !== 'DONE' : false;

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return 'text-[#C35D5D] bg-[#FDF2F2] border-[#F8D7DA]';
      case 'HIGH':
        return 'text-[#B9843D] bg-[#FDF8F0] border-[#FBEAD2]';
      case 'MEDIUM':
        return 'text-[#547DA6] bg-[#F2F6FA] border-[#DCE7F2]';
      case 'LOW':
      default:
        return 'text-[#777B76] bg-[#F0F0EC] border-[#E5E6E1]';
    }
  };

  const project = task.projectId as { name?: string };
  const assignee = task.assigneeId as { _id?: string; name?: string };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white border border-[#E5E6E1] rounded-lg p-3.5 shadow-sm hover:border-[#5556A6] transition-all cursor-pointer ${
        isDragging ? 'opacity-40 shadow-md ring-1 ring-[#5556A6]' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-[#777B76] truncate max-w-[150px]">
          {project?.name || 'No Project'}
        </span>
        <span
          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getPriorityBadge(
            task.priority
          )}`}
        >
          {task.priority}
        </span>
      </div>

      <h3
        {...listeners}
        {...attributes}
        className="text-xs font-semibold text-[#252824] leading-snug line-clamp-2 mb-3 cursor-grab active:cursor-grabbing"
      >
        {task.title}
      </h3>

      <div className="flex items-center justify-between pt-2 border-t border-[#F0F0EC] text-[11px] text-[#777B76]">
        {/* Due date with overdue indicator */}
        <div className="flex items-center space-x-1.5">
          {isOverdue ? (
            <span className="flex items-center space-x-1 text-[#C35D5D] font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>Overdue</span>
            </span>
          ) : dueDate ? (
            <span className="flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-[#969A94] shrink-0" />
              <span>{format(dueDate, 'MMM d')}</span>
            </span>
          ) : (
            <span>No deadline</span>
          )}
        </div>

        {/* Assignee Avatar */}
        <div className="flex items-center space-x-2">
          {assignee?.name && (
            <div
              title={`Assigned to ${assignee.name}`}
              className="w-5 h-5 rounded-full bg-[#E5E6E1] text-[#252824] text-[9px] font-bold flex items-center justify-center shrink-0"
            >
              {assignee.name.charAt(0)}
            </div>
          )}

          {/* Accessible Quick Transition Button */}
          {onQuickTransition && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <select
                value={task.status}
                aria-label={`Change status for task ${task.title}`}
                onChange={(e) => onQuickTransition(task, e.target.value as TaskStatus)}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10px] bg-[#F7F7F4] border border-[#E5E6E1] rounded px-1 py-0.5 text-[#252824] cursor-pointer"
              >
                <option value="TODO" disabled={task.status !== 'TODO'}>
                  To Do
                </option>
                <option
                  value="IN_PROGRESS"
                  disabled={
                    task.status === 'DONE' ||
                    (userRole === 'EMPLOYEE' && task.status !== 'TODO')
                  }
                >
                  In Progress
                </option>
                <option
                  value="IN_REVIEW"
                  disabled={task.status !== 'IN_PROGRESS'}
                >
                  In Review
                </option>
                <option
                  value="DONE"
                  disabled={userRole === 'EMPLOYEE' || task.status !== 'IN_REVIEW'}
                >
                  Done
                </option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
