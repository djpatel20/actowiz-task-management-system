import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from './usersApi.js';
import { teamsApi } from '../teams/teamsApi.js';
import { UserRole } from '../../types/index.js';
import { Users, Plus, ShieldCheck, UserX, UserCheck, X } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.listUsers({ limit: 100 }),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.listTeams(),
    enabled: isModalOpen,
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
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to create user';
      setError(msg);
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
    if (!name.trim() || !email.trim() || !password || ((role === 'MANAGER' || role === 'EMPLOYEE') && !teamId)) {
      setError('Please fill in all required fields including team assignment');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      teamId: role === 'ADMIN' ? undefined : teamId,
    });
  };

  const users = data?.users || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#252824]">User Accounts</h1>
          <p className="text-xs text-[#777B76] mt-0.5">
            Admin oversight: provision accounts, assign roles, and revoke active sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#5556A6] hover:bg-[#45468F] text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New User</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-[#969A94]">Loading user roster...</div>
      ) : (
        <div className="bg-white border border-[#E5E6E1] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F7F4] border-b border-[#E5E6E1] text-[#777B76] uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Team</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E6E1]">
                {users.map((u) => {
                  const id = u.id || (u as unknown as { _id: string })._id;
                  const team = u.teamId as { name?: string } | undefined;
                  return (
                    <tr key={id} className="hover:bg-[#F7F7F4]/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#252824]">{u.name}</div>
                        <div className="text-[11px] text-[#777B76]">{u.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                            u.role === 'ADMIN'
                              ? 'bg-[#5556A6]/10 text-[#5556A6] border-[#5556A6]/20'
                              : u.role === 'MANAGER'
                              ? 'bg-[#B9843D]/10 text-[#B9843D] border-[#B9843D]/20'
                              : 'bg-[#438568]/10 text-[#438568] border-[#438568]/20'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#777B76]">
                        {team?.name || (u.role === 'ADMIN' ? 'Organization-wide' : 'None')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center space-x-1 text-[11px] font-medium ${
                            u.isActive ? 'text-[#438568]' : 'text-[#C35D5D]'
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
                      <td className="px-5 py-3.5 text-right">
                        {u.role !== 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() =>
                              statusMutation.mutate({ userId: id, isActive: !u.isActive })
                            }
                            className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${
                              u.isActive
                                ? 'text-[#C35D5D] hover:bg-[#FDF2F2]'
                                : 'text-[#438568] hover:bg-[#EBF5EE]'
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

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E5E6E1] rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E6E1]">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#5556A6]" />
                <h3 className="text-sm font-semibold text-[#252824]">Provision User Account</h3>
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

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#252824] mb-1">
                  Full Name <span className="text-[#C35D5D]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rachel Zane"
                  className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#252824] mb-1">
                  Email Address <span className="text-[#C35D5D]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rachel@actowiz.com"
                  className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#252824] mb-1">
                  Initial Password <span className="text-[#C35D5D]">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#252824] mb-1">
                    Role <span className="text-[#C35D5D]">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {role !== 'ADMIN' && (
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
