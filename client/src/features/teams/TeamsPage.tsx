import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from './teamsApi.js';
import { useAuth } from '../auth/AuthContext.js';
import { Building2, Plus, Users, FolderKanban, X } from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.listTeams(),
  });

  const createMutation = useMutation({
    mutationFn: teamsApi.createTeam,
    onSuccess: () => {
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to create team';
      setError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#252824]">Teams</h1>
          <p className="text-xs text-[#777B76] mt-0.5">
            Functional organizational units, manager assignments, and employee rosters.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#5556A6] hover:bg-[#45468F] text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Team</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-[#969A94]">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E5E6E1] rounded-lg">
          <Building2 className="w-8 h-8 text-[#969A94] mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#252824]">No teams found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => {
            const manager = t.managerId as { name?: string; email?: string } | null;
            return (
              <div
                key={t._id}
                className="bg-white border border-[#E5E6E1] rounded-lg p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-[#5556A6] bg-[#5556A6]/10 px-2 py-0.5 rounded uppercase">
                      Functional Unit
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[#252824] leading-snug mb-1">
                    {t.name}
                  </h3>
                  <p className="text-xs text-[#777B76] line-clamp-2 mb-4">
                    {t.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E5E6E1]">
                  <div className="text-xs">
                    <span className="text-[11px] font-medium text-[#777B76]">Manager: </span>
                    <span className="font-semibold text-[#252824]">
                      {manager?.name ? `${manager.name} (${manager.email})` : 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#777B76]">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-[#969A94]" />
                      <span>{t.memberCount ?? 0} Employees</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FolderKanban className="w-3.5 h-3.5 text-[#969A94]" />
                      <span>{t.projectCount ?? 0} Projects</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E5E6E1] rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E6E1]">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[#5556A6]" />
                <h3 className="text-sm font-semibold text-[#252824]">Create New Team</h3>
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#252824] mb-1">
                  Team Name <span className="text-[#C35D5D]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Team Gamma (Infrastructure)"
                  className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#252824] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Domain responsibilities and engineering charter..."
                  className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                />
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
                  {createMutation.isPending ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
