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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E5E6E1] rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-[#FDF2F2] text-[#C35D5D]">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#252824]">Reject Task Review</h3>
              <p className="text-xs text-[#777B76]">Provide feedback to the employee.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#969A94] hover:text-[#252824] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-[#F7F7F4] rounded-lg border border-[#E5E6E1]">
          <div className="text-[11px] font-medium text-[#777B76]">Task Title</div>
          <div className="text-xs font-semibold text-[#252824] truncate mt-0.5">{task.title}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#252824] mb-1.5">
              Reason for Rejection <span className="text-[#C35D5D]">*</span>
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
              className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] placeholder-[#969A94] focus:outline-none focus:ring-1 focus:ring-[#5556A6] focus:border-[#5556A6]"
            />
            {error && <p className="text-[11px] text-[#C35D5D] mt-1">{error}</p>}
            <p className="text-[10px] text-[#969A94] mt-1">
              Minimum 5 characters. This reason will be recorded permanently in the task audit log.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-medium text-[#777B76] hover:text-[#252824] hover:bg-[#F0F0EC] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 5}
              className="px-4 py-2 bg-[#C35D5D] hover:bg-[#A94B4B] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Rejecting...' : 'Reject & Return to In Progress'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
