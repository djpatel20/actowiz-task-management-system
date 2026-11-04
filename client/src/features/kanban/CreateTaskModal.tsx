import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../projects/projectsApi.js';
import { teamsApi } from '../teams/teamsApi.js';
import { TaskPriority, User } from '../../types/index.js';
import { X, Plus, Calendar, AlertCircle } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    projectId: string;
    teamId: string;
    assigneeId: string;
    priority: TaskPriority;
    dueDate: string;
  }) => Promise<void>;
  userTeamId?: string | null;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userTeamId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'active'],
    queryFn: () => projectsApi.listProjects({ status: 'ACTIVE', limit: 100 }),
    enabled: isOpen,
  });

  const projects = projectsData?.projects || [];
  const selectedProject = projects.find((p) => p._id === projectId);
  const teamId = selectedProject
    ? typeof selectedProject.teamId === 'string'
      ? selectedProject.teamId
      : selectedProject.teamId._id
    : userTeamId || '';

  // Fetch team members when teamId is determined
  const { data: members } = useQuery<User[]>({
    queryKey: ['team-members', teamId],
    queryFn: () => teamsApi.getTeamMembers(teamId),
    enabled: isOpen && !!teamId,
  });

  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0]._id);
    }
  }, [projects, projectId]);

  useEffect(() => {
    if (members && members.length > 0 && !assigneeId) {
      setAssigneeId(members[0].id || (members[0] as unknown as { _id: string })._id);
    }
  }, [members, assigneeId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !assigneeId || !dueDate) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId,
        teamId,
        assigneeId,
        priority,
        dueDate: new Date(dueDate).toISOString(),
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to create task';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-[#E5E6E1] rounded-lg shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E6E1]">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-[#5556A6]" />
            <h3 className="text-sm font-semibold text-[#252824]">Create New Task</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#969A94] hover:text-[#252824] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-[#FDF2F2] border border-[#F8D7DA] text-[#C35D5D] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#252824] mb-1">
              Title <span className="text-[#C35D5D]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement OAuth 2.0 PKCE flow"
              className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6] focus:border-[#5556A6]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#252824] mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed acceptance criteria or technical context..."
              className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6] focus:border-[#5556A6]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#252824] mb-1">
                Project <span className="text-[#C35D5D]">*</span>
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setAssigneeId('');
                }}
                className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.client})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#252824] mb-1">
                Assignee <span className="text-[#C35D5D]">*</span>
              </label>
              <select
                required
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
              >
                {members && members.length > 0 ? (
                  members.map((m) => {
                    const id = m.id || (m as unknown as { _id: string })._id;
                    return (
                      <option key={id} value={id}>
                        {m.name} ({m.email})
                      </option>
                    );
                  })
                ) : (
                  <option disabled value="">
                    No employees in team
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#252824] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#252824] mb-1">
                Due Date <span className="text-[#C35D5D]">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E6E1]">
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#5556A6] hover:bg-[#45468F] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
