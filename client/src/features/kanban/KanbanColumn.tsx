import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TaskStatus } from '../../types/index.js';

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  count: number;
  children: React.ReactNode;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  count,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const getHeaderAccent = (colStatus: TaskStatus) => {
    switch (colStatus) {
      case 'TODO':
        return 'border-t-[#969A94]';
      case 'IN_PROGRESS':
        return 'border-t-[#547DA6]';
      case 'IN_REVIEW':
        return 'border-t-[#B9843D]';
      case 'DONE':
        return 'border-t-[#438568]';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] sm:min-w-[300px] flex flex-col bg-[#F0F0EC]/60 border border-[#E5E6E1] rounded-lg p-3 transition-colors ${
        isOver ? 'bg-[#EAEAEA] ring-1 ring-[#5556A6]' : ''
      }`}
    >
      {/* Column Header */}
      <div
        className={`flex items-center justify-between pb-3 mb-3 border-b border-[#E5E6E1] border-t-2 pt-1 ${getHeaderAccent(
          status
        )}`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#252824] uppercase tracking-wider">
            {title}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-[#777B76] border border-[#E5E6E1]">
            {count}
          </span>
        </div>
      </div>

      {/* Task Cards Container */}
      <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[350px]">
        {count === 0 ? (
          <div className="h-32 border border-dashed border-[#E5E6E1] rounded-lg flex items-center justify-center text-xs text-[#969A94]">
            No tasks in this column
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
