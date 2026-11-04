import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from './teamsApi.js';
import { usersApi } from '../users/usersApi.js';
import { useAuth } from '../auth/AuthContext.js';
import { Building2, Plus, Users, FolderKanban, X, Trash2, Edit3, AlertTriangle } from 'lucide-react';
import { Team } from '../../types/index.js';

export const TeamsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.listTeams(),
  });

  const { data: managersData } = useQuery({
    queryKey: ['managers'],
    queryFn: () => usersApi.listUsers({ role: 'MANAGER', isActive: true, limit: 100 }),
    enabled: isModalOpen || !!teamToEdit,
  });
  const managers = managersData?.users || [];

  const getManagerIdString = (mgr: unknown): string => {
    if (!mgr) return '';
    if (typeof mgr === 'string') return mgr;
    const obj = mgr as { _id?: string; id?: string };
    return obj._id || obj.id || '';
  };

  const createMutation = useMutation({
    mutationFn: teamsApi.createTeam,
    onSuccess: () => {
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setManagerId('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to create team';
      setError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      teamId,
      data,
    }: {
      teamId: string;
      data: { name?: string; description?: string; managerId?: string | null };
    }) => teamsApi.updateTeam(teamId, data),
    onSuccess: () => {
      setTeamToEdit(null);
      setEditError(null);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to update team';
      setEditError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId: string) => teamsApi.deleteTeam(teamId),
    onSuccess: () => {
      setTeamToDelete(null);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to delete team';
      setDeleteError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      managerId: managerId || undefined,
    });
  };

  const openEditModal = (t: Team) => {
    setTeamToEdit(t);
    setEditName(t.name);
    setEditDescription(t.description || '');
    setEditManagerId(getManagerIdString(t.managerId));
    setEditError(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamToEdit || !editName.trim()) return;
    updateMutation.mutate({
      teamId: teamToEdit._id,
      data: {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        managerId: editManagerId ? editManagerId : null,
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (!teamToDelete) return;
    deleteMutation.mutate(teamToDelete._id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1E1B26]">Teams</h1>
          <p className="text-xs text-[#5B616E] mt-1 font-sans">
            Functional organizational units, manager assignments, and employee rosters.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            type="button"
            onClick={() => {
              setName('');
              setDescription('');
              setManagerId('');
              setError(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 text-[#FF6B00]" />
            <span className="font-heading">New Team</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-[#94A3B8]">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-xl shadow-acto-sm">
          <Building2 className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
          <h3 className="text-sm font-bold font-heading text-[#1E1B26]">No teams found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => {
            const manager = t.managerId as { name?: string; email?: string } | null;
            return (
              <div
                key={t._id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-acto-sm acto-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-[#4400CE] bg-[#4400CE]/10 px-2 py-0.5 rounded uppercase font-heading">
                      Functional Unit
                    </span>
                    {user?.role === 'ADMIN' && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(t)}
                          className="text-[#94A3B8] hover:text-[#4400CE] p-1 rounded-md hover:bg-[#F1F5F9] transition-colors"
                          title="Edit Team"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setTeamToDelete(t);
                          }}
                          className="text-[#94A3B8] hover:text-[#DC2626] p-1 rounded-md hover:bg-[#FEF2F2] transition-colors"
                          title="Delete Team"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold font-heading text-[#1E1B26] leading-snug mb-1">
                    {t.name}
                  </h3>
                  <p className="text-xs text-[#5B616E] line-clamp-2 mb-4 font-sans">
                    {t.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
                  <div className="text-xs">
                    <span className="text-[11px] font-medium text-[#5B616E]">Manager: </span>
                    <span className="font-bold text-[#1E1B26] font-heading">
                      {manager?.name ? `${manager.name} (${manager.email})` : 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#5B616E]">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>{t.memberCount ?? 0} Employees</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FolderKanban className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>{t.projectCount ?? 0} Projects</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-md w-full p-6 animate-pop-in">
            <div className="flex items-center space-x-2 text-[#DC2626] mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold font-heading text-[#1E1B26]">Delete Team</h3>
            </div>

            <p className="text-xs text-[#5B616E] leading-relaxed mb-4">
              Are you sure you want to delete <span className="font-bold text-[#1E1B26]">{teamToDelete.name}</span>? 
              This will unassign members and delete all associated projects and tasks. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setTeamToDelete(null)}
                disabled={deleteMutation.isPending}
                className="px-3.5 py-2 text-xs font-semibold text-[#5B616E] hover:text-[#1E1B26] hover:bg-[#F1F5F9] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 font-heading"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-md w-full p-6 animate-pop-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4400CE] to-[#290660] flex items-center justify-center text-white">
                  <Building2 className="w-4 h-4 text-[#FF6B00]" />
                </div>
                <h3 className="text-base font-bold font-heading text-[#1E1B26]">Create New Team</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B26]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  Team Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Team Gamma (Infrastructure)"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Domain responsibilities and engineering charter..."
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  Assign Manager
                </label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                >
                  <option value="">No Manager (Unassigned)</option>
                  {managers.map((m) => {
                    const mId = m._id || m.id;
                    return (
                      <option key={mId} value={mId}>
                        {m.name} ({m.email})
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-[#5B616E] mt-1">
                  Optionally select an active manager to lead this team.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={createMutation.isPending}
                  className="px-3.5 py-2 text-xs font-semibold text-[#5B616E] hover:text-[#1E1B26] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all disabled:opacity-50 font-heading"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {teamToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-md w-full p-6 animate-pop-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4400CE] to-[#290660] flex items-center justify-center text-white">
                  <Edit3 className="w-4 h-4 text-[#FF6B00]" />
                </div>
                <h3 className="text-base font-bold font-heading text-[#1E1B26]">Edit Team</h3>
              </div>
              <button
                type="button"
                onClick={() => setTeamToEdit(null)}
                className="text-[#94A3B8] hover:text-[#1E1B26]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  Team Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Team Gamma"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Domain responsibilities and engineering charter..."
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  Assigned Manager
                </label>
                <select
                  value={editManagerId}
                  onChange={(e) => setEditManagerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                >
                  <option value="">No Manager (Unassigned)</option>
                  {managers.map((m) => {
                    const mId = m._id || m.id;
                    return (
                      <option key={mId} value={mId}>
                        {m.name} ({m.email})
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-[#5B616E] mt-1">
                  Change the assigned manager or select Unassigned to clear.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setTeamToEdit(null)}
                  disabled={updateMutation.isPending}
                  className="px-3.5 py-2 text-xs font-semibold text-[#5B616E] hover:text-[#1E1B26] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all disabled:opacity-50 font-heading"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
