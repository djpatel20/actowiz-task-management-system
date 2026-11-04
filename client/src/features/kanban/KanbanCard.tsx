import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Task, TaskPriority, TaskStatus, UserRole } from '../../types/index.js';
import { Calendar, AlertCircle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

interface KanbanCardProps {
  task: Task;
  userRole?: UserRole;
  currentUserId?: string;
  onClick?: () => void;
  onQuickTransition?: (task: Task, targetStatus: TaskStatus) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  userRole,
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
  const isDateValid = dueDate && !isNaN(dueDate.getTime());
  const isOverdue = isDateValid ? isPast(dueDate) && !isToday(dueDate) && task.status !== 'DONE' : false;

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return 'text-[#DC2626] bg-[#FEF2F2] border-[#FCA5A5]';
      case 'HIGH':
        return 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]';
      case 'MEDIUM':
        return 'text-[#0071CE] bg-[#F0F7FF] border-[#BAE6FD]';
      case 'LOW':
      default:
        return 'text-[#64748B] bg-[#F8FAFC] border-[#E2E8F0]';
    }
  };

  const project = task.projectId as { name?: string };
  const assignee = task.assigneeId as { _id?: string; name?: string };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`group bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-acto-sm acto-card transition-all cursor-pointer hover:border-[#4400CE]/40 hover:shadow-acto-md select-none ${
        isDragging ? 'opacity-40 shadow-acto-lg ring-2 ring-[#4400CE] cursor-grabbing' : ''
      }`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging && onClick) {
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-[#5B616E] truncate max-w-[150px] font-heading">
          {project?.name || 'No Project'}
        </span>
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getPriorityBadge(
            task.priority
          )}`}
        >
          {task.priority}
        </span>
      </div>

      <h3 className="text-xs font-semibold text-[#1E1B26] leading-snug line-clamp-2 mb-3 font-sans group-hover:text-[#290660] transition-colors pointer-events-none">
        {task.title}
      </h3>

      <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] text-[11px] text-[#5B616E]">
        {/* Due date with overdue indicator */}
        <div className="flex items-center space-x-1.5">
          {isOverdue ? (
            <span className="flex items-center space-x-1 text-[#DC2626] font-semibold">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>Overdue</span>
            </span>
          ) : isDateValid ? (
            <span className="flex items-center space-x-1 text-[#64748B]">
              <Calendar className="w-3 h-3 text-[#94A3B8] shrink-0" />
              <span>{format(dueDate, 'MMM d')}</span>
            </span>
          ) : (
            <span className="text-[#94A3B8]">No deadline</span>
          )}
        </div>

        {/* Assignee Avatar */}
        <div className="flex items-center space-x-2">
          {assignee?.name && (
            <div
              title={`Assigned to ${assignee.name}`}
              className="w-5 h-5 rounded-full bg-gradient-to-br from-[#4400CE] to-[#290660] text-white text-[9px] font-bold flex items-center justify-center shrink-0 shadow-2xs"
            >
              {assignee.name.charAt(0)}
            </div>
          )}

          {/* Accessible Quick Transition Button */}
          {onQuickTransition && (
            <div
              className="relative"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <select
                value={task.status}
                aria-label={`Change status for task ${task.title}`}
                onChange={(e) => onQuickTransition(task, e.target.value as TaskStatus)}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10px] bg-[#F8FAFC] border border-[#E2E8F0] rounded px-1 py-0.5 text-[#1E1B26] cursor-pointer focus:ring-1 focus:ring-[#290660] transition-opacity"
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
