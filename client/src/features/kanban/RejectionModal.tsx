import React, { useState } from 'react';
import { Task } from '../../types/index.js';
import { AlertCircle, X } from 'lucide-react';

interface RejectionModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting?: boolean;
}

export const RejectionModal: React.FC<RejectionModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Rejection reason must be at least 5 characters');
      return;
    }
    setError(null);
    onSubmit(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-md w-full p-6 animate-pop-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#FEF2F2] text-[#DC2626]">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E1B26] font-heading">Reject Task Review</h3>
              <p className="text-xs text-[#5B616E]">Provide feedback to the employee.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#1E1B26] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
          <div className="text-[11px] font-semibold text-[#5B616E] font-heading uppercase tracking-wider">Task Title</div>
          <div className="text-xs font-semibold text-[#1E1B26] truncate mt-0.5">{task.title}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E1B26] mb-1.5 font-heading">
              Reason for Rejection <span className="text-[#DC2626]">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Explain required changes, failing criteria, or missing documentation..."
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] transition-all"
            />
            {error && <p className="text-[11px] text-[#DC2626] mt-1 font-medium">{error}</p>}
            <p className="text-[10px] text-[#94A3B8] mt-1 font-sans">
              Minimum 5 characters. This reason will be recorded permanently in the task audit log.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-semibold text-[#5B616E] hover:text-[#1E1B26] hover:bg-[#F1F5F9] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 5}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 font-heading"
            >
              {isSubmitting ? 'Rejecting...' : 'Reject & Return to In Progress'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
