import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { projectsApi } from '../projects/projectsApi.js';
import { teamsApi } from '../teams/teamsApi.js';
import { TaskPriority, User } from '../../types/index.js';
import { useAuth } from '../auth/AuthContext.js';
import { X, Plus, AlertCircle } from 'lucide-react';

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
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'active'],
    queryFn: () => projectsApi.listProjects({ status: 'ACTIVE', limit: 100 }),
    enabled: isOpen,
  });

  const allProjects = projectsData?.projects || [];
  const projects = user?.role === 'MANAGER'
    ? allProjects.filter((p) => {
        const pManagerId = p.managerId
          ? (typeof p.managerId === 'string'
              ? p.managerId
              : (p.managerId as { _id?: string; id?: string })._id || (p.managerId as { id?: string }).id)
          : null;
        const pTeamId = p.teamId
          ? (typeof p.teamId === 'string'
              ? p.teamId
              : (p.teamId as { _id?: string; id?: string })._id || (p.teamId as { id?: string }).id)
          : null;
        const isMgr = Boolean(pManagerId && (pManagerId === user.id || pManagerId === user._id));
        const isTeam = Boolean(user.teamId && pTeamId && pTeamId === user.teamId);
        return isMgr || isTeam;
      })
    : allProjects;
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

  const todayString = format(new Date(), 'yyyy-MM-dd');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !assigneeId || !dueDate) {
      setError('Please fill in all required fields');
      return;
    }

    if (dueDate < todayString) {
      setError('Due date cannot be in the past');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-lg w-full p-6 animate-pop-in">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4400CE] to-[#290660] flex items-center justify-center text-white shadow-2xs">
              <Plus className="w-4 h-4 text-[#FF6B00]" />
            </div>
            <h3 className="text-base font-bold font-heading text-[#1E1B26]">Create New Task</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#1E1B26] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
              Title <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement OAuth 2.0 PKCE flow"
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed acceptance criteria or technical context..."
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                Project <span className="text-[#DC2626]">*</span>
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setAssigneeId('');
                }}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.client})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                Assignee <span className="text-[#DC2626]">*</span>
              </label>
              <select
                required
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
              >
                {members && members.length > 0 ? (
                  members.map((m) => {
                    const id = m.id || (m as unknown as { _id: string })._id;
                    return (
                      <option key={id} value={id}>
                        {m.name} ({m.role}) - {m.email}
                      </option>
                    );
                  })
                ) : (
                  <option disabled value="">
                    No members in team
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                Due Date <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  min={todayString}
                  value={dueDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && val < todayString) {
                      setError('Due date cannot be in the past');
                    } else if (error === 'Due date cannot be in the past') {
                      setError(null);
                    }
                    setDueDate(val);
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all disabled:opacity-50 font-heading"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
