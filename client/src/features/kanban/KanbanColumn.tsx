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
        return 'border-t-[#94A3B8] text-[#5B616E]';
      case 'IN_PROGRESS':
        return 'border-t-[#0071CE] text-[#0071CE]'; // Actowiz Tech Blue
      case 'IN_REVIEW':
        return 'border-t-[#FF6B00] text-[#FF6B00]'; // Actowiz Signature Orange
      case 'DONE':
        return 'border-t-[#10B981] text-[#10B981]'; // Emerald
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] sm:min-w-[300px] flex flex-col bg-[#F1F5F9]/70 border border-[#E2E8F0] rounded-xl p-3.5 transition-all duration-200 ${
        isOver ? 'bg-[#EAEFF8] ring-2 ring-[#4400CE]/40 shadow-acto-md' : ''
      }`}
    >
      {/* Column Header */}
      <div
        className={`flex items-center justify-between pb-3 mb-3 border-b border-[#E2E8F0] border-t-2 pt-1.5 ${getHeaderAccent(
          status
        )}`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider font-heading text-[#1E1B26]">
            {title}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-[#5B616E] border border-[#E2E8F0] shadow-2xs font-heading">
            {count}
          </span>
        </div>
      </div>

      {/* Task Cards Container */}
      <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[350px]">
        {count === 0 ? (
          <div className="h-32 border border-dashed border-[#CBD5E1] rounded-xl flex items-center justify-center text-xs text-[#94A3B8] font-sans">
            No tasks in this column
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
