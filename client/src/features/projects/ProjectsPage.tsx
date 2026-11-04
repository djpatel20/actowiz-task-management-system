import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from './projectsApi.js';
import { teamsApi } from '../teams/teamsApi.js';
import { useAuth } from '../auth/AuthContext.js';
import { FolderKanban, Plus, Calendar, Building2, X, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [client, setClient] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [teamId, setTeamId] = useState(user?.teamId || '');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.listProjects({ limit: 100 }),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.listTeams(),
    enabled: isModalOpen && user?.role === 'ADMIN',
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to create project';
      setError(msg);
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setClient('');
    setStartDate('');
    setEndDate('');
    setTeamId(user?.teamId || '');
    setError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !client.trim() || !startDate || !endDate || !teamId) {
      setError('Please fill in all required fields');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      client: client.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      teamId,
    });
  };

  const projects = data?.projects || [];
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#252824]">Projects</h1>
          <p className="text-xs text-[#777B76] mt-0.5">
            Client engagements, delivery timelines, and dynamic task completion metrics.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#5556A6] hover:bg-[#45468F] text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-[#969A94]">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E5E6E1] rounded-lg">
          <FolderKanban className="w-8 h-8 text-[#969A94] mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#252824]">No projects found</h3>
          <p className="text-xs text-[#777B76] mt-1">
            Projects created for your team will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const team = p.teamId as { name?: string };
            const progress = p.progressPercentage ?? 0;
            return (
              <div
                key={p._id}
                className="bg-white border border-[#E5E6E1] rounded-lg p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-[#5556A6] bg-[#5556A6]/10 px-2 py-0.5 rounded uppercase">
                      {p.client}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase ${
                        p.status === 'ACTIVE'
                          ? 'text-[#438568] bg-[#EBF5EE] border-[#D1EADB]'
                          : 'text-[#777B76] bg-[#F0F0EC] border-[#E5E6E1]'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[#252824] leading-snug mb-1.5">
                    {p.name}
                  </h3>
                  <p className="text-xs text-[#777B76] line-clamp-2 mb-4">
                    {p.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E5E6E1]">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[11px] font-medium text-[#777B76]">Progress</span>
                      <span className="font-semibold text-[#252824]">{progress}%</span>
                    </div>
                    <div className="w-full bg-[#E5E6E1] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#438568] h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-[11px] text-[#777B76]">
                    <div className="flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-[#969A94]" />
                      <span>{team?.name || 'Team'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-[#969A94]" />
                      <span>
                        {format(new Date(p.startDate), 'MMM d')} - {format(new Date(p.endDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E5E6E1] rounded-lg shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E6E1]">
              <div className="flex items-center space-x-2">
                <FolderKanban className="w-5 h-5 text-[#5556A6]" />
                <h3 className="text-sm font-semibold text-[#252824]">Create New Project</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#969A94] hover:text-[#252824]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-[#FDF2F2] border border-[#F8D7DA] text-[#C35D5D] text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#252824] mb-1">
                  Project Name <span className="text-[#C35D5D]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Core Settlement Engine Migration"
                  className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#252824] mb-1">
                  Client Organization <span className="text-[#C35D5D]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="e.g. Apex Financial"
                  className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#252824] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objectives, deliverables, and scope..."
                  className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                />
              </div>

              {user?.role === 'ADMIN' && (
                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    Assigned Team <span className="text-[#C35D5D]">*</span>
                  </label>
                  <select
                    required
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                  >
                    <option value="">Select a team</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    Start Date <span className="text-[#C35D5D]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    End Date <span className="text-[#C35D5D]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E6E1]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={createMutation.isPending}
                  className="px-3.5 py-2 text-xs font-medium text-[#777B76] hover:text-[#252824] hover:bg-[#F0F0EC] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-[#5556A6] hover:bg-[#45468F] text-white text-xs font-medium rounded-lg disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
