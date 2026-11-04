import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from './teamsApi.js';
import { usersApi } from '../users/usersApi.js';
import { useAuth } from '../auth/AuthContext.js';
import {
  Building2,
  Plus,
  Users,
  FolderKanban,
  X,
  Trash2,
  Edit3,
  AlertTriangle,
  UserPlus,
  UserMinus,
  ShieldCheck,
} from 'lucide-react';
import { Team, User } from '../../types/index.js';

export const TeamsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [teamForMembers, setTeamForMembers] = useState<Team | null>(null);

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Member management state
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.listTeams(),
  });

  const { data: managersData } = useQuery({
    queryKey: ['managers'],
    queryFn: () => usersApi.listUsers({ role: 'MANAGER', isActive: true, limit: 100 }),
    enabled: !!teamToEdit,
  });
  const managers = managersData?.users || [];

  // Active users query for adding to team roster
  const { data: allUsersData } = useQuery({
    queryKey: ['all-assignable-users'],
    queryFn: () => usersApi.listUsers({ isActive: true, limit: 200 }),
    enabled: !!teamForMembers && user?.role === 'ADMIN',
  });
  const assignableUsers = (allUsersData?.users || []).filter(
    (u) => u.role === 'MANAGER' || u.role === 'EMPLOYEE'
  );

  // Team members query for current team
  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['team-members', teamForMembers?._id],
    queryFn: () => (teamForMembers ? teamsApi.getTeamMembers(teamForMembers._id) : Promise.resolve([])),
    enabled: !!teamForMembers,
  });

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

  const addMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      teamsApi.addTeamMember(teamId, userId),
    onSuccess: () => {
      setSelectedUserIdToAdd('');
      setMemberError(null);
      if (teamForMembers) {
        queryClient.invalidateQueries({ queryKey: ['team-members', teamForMembers._id] });
      }
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to add member to team';
      setMemberError(msg);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      teamsApi.removeTeamMember(teamId, userId),
    onSuccess: () => {
      setMemberError(null);
      if (teamForMembers) {
        queryClient.invalidateQueries({ queryKey: ['team-members', teamForMembers._id] });
      }
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to remove member from team';
      setMemberError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
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

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForMembers || !selectedUserIdToAdd) return;
    addMemberMutation.mutate({
      teamId: teamForMembers._id,
      userId: selectedUserIdToAdd,
    });
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
                  <div className="flex items-center justify-between text-[11px] text-[#5B616E]">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>{t.memberCount ?? ((t.managerCount ?? 0) + (t.employeeCount ?? 0))} Members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FolderKanban className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>{t.projectCount ?? 0} Projects</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTeamForMembers(t);
                      setSelectedUserIdToAdd('');
                      setMemberError(null);
                    }}
                    className="w-full mt-2 flex items-center justify-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#4400CE] bg-[#4400CE]/5 hover:bg-[#4400CE]/10 border border-[#4400CE]/20 rounded-lg transition-colors font-heading"
                  >
                    <Users className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>View Members ({t.memberCount ?? 0})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Team Members Management Modal */}
      {teamForMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-lg w-full p-6 animate-pop-in flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0] shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4400CE] to-[#290660] flex items-center justify-center text-white">
                  <Users className="w-4 h-4 text-[#FF6B00]" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-[#1E1B26]">
                    Team Members
                  </h3>
                  <p className="text-[11px] text-[#5B616E] font-sans">{teamForMembers.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTeamForMembers(null)}
                className="text-[#94A3B8] hover:text-[#1E1B26]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {memberError && (
              <div className="mb-4 p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs shrink-0">
                {memberError}
              </div>
            )}

            {/* Admin Add Member Form */}
            {user?.role === 'ADMIN' && (
              <form onSubmit={handleAddMemberSubmit} className="mb-4 pb-4 border-b border-[#E2E8F0] shrink-0">
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1.5 font-heading">
                  Add Manager or Employee to Team
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedUserIdToAdd}
                    onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                  >
                    <option value="">Select a Manager or Employee...</option>
                    {assignableUsers.map((u) => {
                      const uId = u._id || u.id;
                      const isCurrentMember = teamMembers.some(
                        (m) => (m._id || m.id) === uId
                      );
                      return (
                        <option
                          key={uId}
                          value={uId}
                          disabled={isCurrentMember}
                        >
                          {u.name} — [{u.role}] {isCurrentMember ? '✓ Already in this team' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="submit"
                    disabled={!selectedUserIdToAdd || addMemberMutation.isPending}
                    className="flex items-center space-x-1 px-3.5 py-2 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all disabled:opacity-50 font-heading shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>{addMemberMutation.isPending ? 'Adding...' : 'Add'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-[#5B616E] mt-1">
                  You can add any number of managers and employees to this team. Users can belong to multiple teams.
                </p>
              </form>
            )}

            {/* Current Team Roster */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-semibold font-heading text-[#1E1B26] mb-2 flex items-center justify-between">
                <span>Roster ({teamMembers.length})</span>
                <span className="text-[10px] text-[#5B616E] font-normal">
                  {teamMembers.filter((m) => m.role === 'MANAGER').length} Managers ·{' '}
                  {teamMembers.filter((m) => m.role === 'EMPLOYEE').length} Employees
                </span>
              </h4>

              {isLoadingMembers ? (
                <div className="py-8 text-center text-xs text-[#94A3B8]">Loading roster...</div>
              ) : teamMembers.length === 0 ? (
                <div className="p-6 text-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  <p className="text-xs text-[#5B616E]">No managers or employees currently assigned to this team.</p>
                </div>
              ) : (
                teamMembers.map((member: User) => {
                  const mId = member._id || member.id;
                  const isManager = member.role === 'MANAGER';

                  return (
                    <div
                      key={mId}
                      className="flex items-center justify-between p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg hover:border-[#CBD5E1] transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                            isManager
                              ? 'bg-gradient-to-tr from-[#4400CE] to-[#290660]'
                              : 'bg-gradient-to-tr from-[#3B82F6] to-[#1D4ED8]'
                          }`}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold font-heading text-[#1E1B26] truncate">
                              {member.name}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase font-heading ${
                                isManager
                                  ? 'bg-[#4400CE]/10 text-[#4400CE]'
                                  : 'bg-[#3B82F6]/10 text-[#2563EB]'
                              }`}
                            >
                              {member.role}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#5B616E] truncate">{member.email}</p>
                        </div>
                      </div>

                      {user?.role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() =>
                            removeMemberMutation.mutate({
                              teamId: teamForMembers._id,
                              userId: mId,
                            })
                          }
                          disabled={removeMemberMutation.isPending}
                          className="text-[#94A3B8] hover:text-[#DC2626] p-1.5 rounded-md hover:bg-[#FEF2F2] transition-colors ml-2 shrink-0"
                          title="Remove from this team"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end pt-4 mt-3 border-t border-[#E2E8F0] shrink-0">
              <button
                type="button"
                onClick={() => setTeamForMembers(null)}
                className="px-4 py-2 text-xs font-semibold text-[#5B616E] hover:text-[#1E1B26] hover:bg-[#F1F5F9] rounded-lg transition-colors font-heading"
              >
                Close
              </button>
            </div>
          </div>
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

              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] text-[#5B616E] leading-relaxed">
                <span className="font-semibold text-[#1E1B26]">Roster Assignment:</span> You can add multiple managers and employees after creating the team using the <span className="font-semibold text-[#4400CE]">Manage Members</span> button on the team card.
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
                  Primary Assigned Manager
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
                  Change the primary assigned manager or use Manage Members to assign multiple managers.
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
