import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from './usersApi.js';
import { teamsApi } from '../teams/teamsApi.js';
import { User, UserRole } from '../../types/index.js';
import { useAuth } from '../auth/AuthContext.js';
import { Users, Plus, UserX, UserCheck, X, Shield, Edit3 } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/errors.js';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Create Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Edit Role Form states
  const [editRole, setEditRole] = useState<UserRole>('EMPLOYEE');
  const [editTeamId, setEditTeamId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.listUsers({ limit: 100 }),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.listTeams(),
    enabled: isModalOpen || !!userToEdit,
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      usersApi.updateUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: unknown) => {
      setError(getApiErrorMessage(err, 'Failed to create user'));
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
      teamId,
    }: {
      userId: string;
      role: UserRole;
      teamId?: string | null;
    }) => usersApi.updateUser(userId, { role, teamId }),
    onSuccess: () => {
      setUserToEdit(null);
      setEditError(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: unknown) => {
      setEditError(getApiErrorMessage(err, 'Failed to update user role'));
    },
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('EMPLOYEE');
    setTeamId('');
    setError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Full name is required');
      return;
    }
    if (name.trim().length < 2) {
      setError('Full name must be at least 2 characters long');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Initial password is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if ((role === 'MANAGER' || role === 'EMPLOYEE') && !teamId) {
      setError('Team assignment is required for Managers and Employees');
      return;
    }
    setError(null);
    createMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      teamId: role === 'ADMIN' ? undefined : teamId,
    });
  };

  const openEditModal = (u: User) => {
    const isSelfUser = Boolean(
      currentUser &&
        ((currentUser._id && (u._id === currentUser._id || (u.id && u.id === currentUser._id))) ||
         (currentUser.id && ((u.id && u.id === currentUser.id) || (u._id && u._id === currentUser.id))) ||
         (currentUser.email && u.email === currentUser.email))
    );
    if (isSelfUser) return;
    setUserToEdit(u);
    setEditRole(u.role);
    const existingTeamId =
      typeof u.teamId === 'string'
        ? u.teamId
        : (u.teamId as unknown as { _id?: string })?._id || '';
    setEditTeamId(existingTeamId);
    setEditError(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    const id = userToEdit.id || (userToEdit as unknown as { _id: string })._id;
    if ((editRole === 'MANAGER' || editRole === 'EMPLOYEE') && !editTeamId) {
      setEditError('A team assignment is required for Managers and Employees');
      return;
    }

    updateRoleMutation.mutate({
      userId: id,
      role: editRole,
      teamId: editRole === 'ADMIN' ? null : editTeamId,
    });
  };

  const users = data?.users || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1E1B26]">User Accounts</h1>
          <p className="text-xs text-[#5B616E] mt-1 font-sans">
            Admin oversight: provision accounts, assign roles, and configure team memberships.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#FF6B00]" />
          <span className="font-heading">New User</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-[#94A3B8]">Loading user roster...</div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#5B616E] uppercase font-bold font-heading">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Team</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {users.map((u) => {
                  const id = u.id || (u as unknown as { _id: string })._id;
                  const team = u.teamId as { name?: string } | undefined;
                  return (
                    <tr key={id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#1E1B26] font-heading">{u.name}</div>
                        <div className="text-[11px] text-[#5B616E]">{u.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            u.role === 'ADMIN'
                              ? 'bg-[#4400CE]/10 text-[#4400CE] border-[#4400CE]/20'
                              : u.role === 'MANAGER'
                              ? 'bg-[#FF6B00]/10 text-[#FF6B00] border-[#FF6B00]/20'
                              : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#5B616E]">
                        {team?.name || (u.role === 'ADMIN' ? 'Organization-wide' : 'None')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center space-x-1 text-[11px] font-semibold ${
                            u.isActive ? 'text-[#059669]' : 'text-[#DC2626]'
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Deactivated</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        {Boolean(
                          currentUser &&
                            ((currentUser._id && (u._id === currentUser._id || id === currentUser._id)) ||
                             (currentUser.id && (id === currentUser.id || u.id === currentUser.id)) ||
                             (currentUser.email && u.email === currentUser.email))
                        ) ? (
                          <span className="inline-block text-[11px] font-medium text-[#94A3B8] italic px-2.5 py-1">
                            Current User
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 text-[#4400CE] hover:bg-[#4400CE]/10 rounded transition-colors cursor-pointer"
                            title="Assign Role & Team"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Assign Role</span>
                          </button>
                        )}

                        {u.role !== 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() =>
                              statusMutation.mutate({ userId: id, isActive: !u.isActive })
                            }
                            className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer ${
                              u.isActive
                                ? 'text-[#DC2626] hover:bg-[#FEF2F2]'
                                : 'text-[#059669] hover:bg-[#ECFDF5]'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign User Role Modal */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-md w-full p-6 animate-pop-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4400CE] to-[#290660] flex items-center justify-center text-white">
                  <Shield className="w-4 h-4 text-[#FF6B00]" />
                </div>
                <h3 className="text-base font-bold font-heading text-[#1E1B26]">Assign User Role & Team</h3>
              </div>
              <button
                type="button"
                onClick={() => setUserToEdit(null)}
                className="text-[#94A3B8] hover:text-[#1E1B26] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs">
              <div className="font-bold text-[#1E1B26] font-heading">{userToEdit.name}</div>
              <div className="text-[#5B616E]">{userToEdit.email}</div>
            </div>

            {editError && (
              <div className="mb-4 p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  System Role <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                >
                  <option value="EMPLOYEE">Employee (Executes assigned tasks)</option>
                  <option value="MANAGER">Manager (Manages team projects & reviews)</option>
                  <option value="ADMIN">Admin (Full organization authority)</option>
                </select>
              </div>

              {editRole !== 'ADMIN' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                    Assigned Team <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    required
                    value={editTeamId}
                    onChange={(e) => setEditTeamId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                  >
                    <option value="">Select team</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  disabled={updateRoleMutation.isPending}
                  className="px-3.5 py-2 text-xs font-semibold text-[#5B616E] hover:text-[#1E1B26] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateRoleMutation.isPending}
                  className="px-4 py-2 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all disabled:opacity-50 font-heading cursor-pointer"
                >
                  {updateRoleMutation.isPending ? 'Saving...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-md w-full p-6 animate-pop-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4400CE] to-[#290660] flex items-center justify-center text-white">
                  <Users className="w-4 h-4 text-[#FF6B00]" />
                </div>
                <h3 className="text-base font-bold font-heading text-[#1E1B26]">Provision User Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B26] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  Full Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rachel Zane"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  Email Address <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rachel@actowiz.com"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  Initial Password <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters (e.g. Pass1234!)"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
                <p className="text-[11px] text-[#5B616E] mt-1 font-sans">
                  Must be at least 8 characters long.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                    Role <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {role !== 'ADMIN' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                      Assigned Team <span className="text-[#DC2626]">*</span>
                    </label>
                    <select
                      required
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                    >
                      <option value="">Select team</option>
                      {teams.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={createMutation.isPending}
                  className="px-3.5 py-2 text-xs font-semibold text-[#5B616E] hover:text-[#1E1B26] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all disabled:opacity-50 font-heading cursor-pointer"
                >
                  {createMutation.isPending ? 'Provisioning...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
