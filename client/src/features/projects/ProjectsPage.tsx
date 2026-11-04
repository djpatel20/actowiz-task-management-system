import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from './projectsApi.js';
import { teamsApi } from '../teams/teamsApi.js';
import { usersApi } from '../users/usersApi.js';
import { useAuth } from '../auth/AuthContext.js';
import { FolderKanban, Plus, Calendar, Building2, X, Trash2, Edit3, AlertTriangle, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Project, ProjectStatus } from '../../types/index.js';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  // Create Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [client, setClient] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [teamId, setTeamId] = useState(user?.teamId || '');
  const [managerId, setManagerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit Form states
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [initialStartDate, setInitialStartDate] = useState('');
  const [initialEndDate, setInitialEndDate] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('ACTIVE');
  const [editError, setEditError] = useState<string | null>(null);

  const todayString = format(new Date(), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.listProjects({ limit: 100 }),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.listTeams(),
    enabled: (isModalOpen || !!projectToEdit) && user?.role === 'ADMIN',
  });

  const { data: managersData } = useQuery({
    queryKey: ['managers'],
    queryFn: () => usersApi.listUsers({ role: 'MANAGER', isActive: true, limit: 100 }),
    enabled: isModalOpen || !!projectToEdit,
  });

  const managers = managersData?.users || [];

  const createMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to create project';
      setError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: {
        name?: string;
        description?: string;
        client?: string;
        startDate?: string;
        endDate?: string;
        teamId?: string;
        status?: ProjectStatus;
        managerId?: string | null;
      };
    }) => projectsApi.updateProject(projectId, data),
    onSuccess: () => {
      setProjectToEdit(null);
      setEditError(null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to update project';
      setEditError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => projectsApi.deleteProject(projectId),
    onSuccess: () => {
      setProjectToDelete(null);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Failed to delete project';
      setDeleteError(msg);
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setClient('');
    setStartDate('');
    setEndDate('');
    setTeamId(user?.teamId || '');
    setManagerId('');
    setError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !client.trim() || !startDate || !endDate || !teamId) {
      setError('Please fill in all required fields');
      return;
    }
    if (startDate < todayString) {
      setError('Start date cannot be in the past');
      return;
    }
    if (endDate < todayString) {
      setError('End date cannot be in the past');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be greater than or equal to start date');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      client: client.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      teamId,
      managerId: managerId || undefined,
    });
  };

  const openEditModal = (p: Project) => {
    setProjectToEdit(p);
    setEditName(p.name);
    setEditDescription(p.description || '');
    setEditClient(p.client);
    const sStr = p.startDate ? format(new Date(p.startDate), 'yyyy-MM-dd') : '';
    const eStr = p.endDate ? format(new Date(p.endDate), 'yyyy-MM-dd') : '';
    setEditStartDate(sStr);
    setEditEndDate(eStr);
    setInitialStartDate(sStr);
    setInitialEndDate(eStr);

    const tId =
      typeof p.teamId === 'string'
        ? p.teamId
        : (p.teamId as { _id?: string; id?: string })?._id ||
          (p.teamId as { id?: string })?.id ||
          '';
    setEditTeamId(tId);

    const mId =
      typeof p.managerId === 'string'
        ? p.managerId
        : (p.managerId as { _id?: string; id?: string })?._id ||
          (p.managerId as { id?: string })?.id ||
          '';
    setEditManagerId(mId);

    setEditStatus(p.status);
    setEditError(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;
    if (!editName.trim() || !editClient.trim() || !editStartDate || !editEndDate) {
      setEditError('Please fill in all required fields');
      return;
    }
    if (editStartDate < todayString && editStartDate !== initialStartDate) {
      setEditError('Start date cannot be in the past');
      return;
    }
    if (editEndDate < todayString && editEndDate !== initialEndDate) {
      setEditError('End date cannot be in the past');
      return;
    }
    if (new Date(editEndDate) < new Date(editStartDate)) {
      setEditError('End date must be greater than or equal to start date');
      return;
    }

    const patchData: {
      name: string;
      description?: string;
      client: string;
      startDate?: string;
      endDate?: string;
      teamId?: string;
      managerId: string | null;
      status: ProjectStatus;
    } = {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      client: editClient.trim(),
      teamId: editTeamId || undefined,
      managerId: editManagerId ? editManagerId : null,
      status: editStatus,
    };

    if (editStartDate !== initialStartDate || editStartDate >= todayString) {
      patchData.startDate = new Date(editStartDate).toISOString();
    }
    if (editEndDate !== initialEndDate || editEndDate >= todayString) {
      patchData.endDate = new Date(editEndDate).toISOString();
    }

    updateMutation.mutate({
      projectId: projectToEdit._id,
      data: patchData,
    });
  };

  const handleDeleteConfirm = () => {
    if (!projectToDelete) return;
    deleteMutation.mutate(projectToDelete._id);
  };

  const projects = data?.projects || [];
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#1E1B26]">Projects</h1>
          <p className="text-xs text-[#5B616E] mt-1 font-sans">
            Client engagements, delivery timelines, and dynamic task completion metrics.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-[#4400CE] to-[#290660] hover:from-[#3B00B5] hover:to-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 text-[#FF6B00]" />
            <span className="font-heading">New Project</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-[#94A3B8]">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-xl shadow-acto-sm">
          <FolderKanban className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
          <h3 className="text-sm font-bold font-heading text-[#1E1B26]">No projects found</h3>
          <p className="text-xs text-[#5B616E] mt-1">
            Projects created for your team will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const team = p.teamId as { name?: string };
            const manager = p.managerId as { name?: string; email?: string } | null;
            const progress = p.progressPercentage ?? 0;
            return (
              <div
                key={p._id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-acto-sm acto-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-[#4400CE] bg-[#4400CE]/10 px-2 py-0.5 rounded uppercase font-heading">
                      {p.client}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          p.status === 'ACTIVE'
                            ? 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]'
                            : 'text-[#64748B] bg-[#F8FAFC] border-[#E2E8F0]'
                        }`}
                      >
                        {p.status}
                      </span>
                      {user?.role === 'ADMIN' && (
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="text-[#94A3B8] hover:text-[#4400CE] p-1 rounded-md hover:bg-[#F1F5F9] transition-colors"
                            title="Edit Project"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setProjectToDelete(p);
                            }}
                            className="text-[#94A3B8] hover:text-[#DC2626] p-1 rounded-md hover:bg-[#FEF2F2] transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold font-heading text-[#1E1B26] leading-snug mb-1.5">
                    {p.name}
                  </h3>
                  <p className="text-xs text-[#5B616E] line-clamp-2 mb-4 font-sans">
                    {p.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
                  {/* Progress Bar with Actowiz primary gradient */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1 font-sans">
                      <span className="text-[11px] font-medium text-[#5B616E]">Progress</span>
                      <span className="font-bold text-[#1E1B26] font-heading">{progress}%</span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#4400CE] to-[#290660] h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1.5 text-[11px] text-[#5B616E]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>{team?.name || 'Team'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>
                          {p.startDate && p.endDate
                            ? `${format(new Date(p.startDate), 'MMM d')} - ${format(new Date(p.endDate), 'MMM d, yyyy')}`
                            : 'Dates not set'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 text-[11px]">
                      <UserCheck className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span className="text-[#5B616E]">Manager: </span>
                      <span className="font-semibold text-[#1E1B26] truncate">
                        {manager?.name ? `${manager.name} (${manager.email})` : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-md w-full p-6 animate-pop-in">
            <div className="flex items-center space-x-2 text-[#DC2626] mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold font-heading text-[#1E1B26]">Delete Project</h3>
            </div>

            <p className="text-xs text-[#5B616E] leading-relaxed mb-4">
              Are you sure you want to delete <span className="font-bold text-[#1E1B26]">{projectToDelete.name}</span>? 
              This will permanently delete the project and all its associated tasks and audit history. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
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
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-lg w-full p-6 animate-pop-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4400CE] to-[#290660] flex items-center justify-center text-white">
                  <FolderKanban className="w-4 h-4 text-[#FF6B00]" />
                </div>
                <h3 className="text-base font-bold font-heading text-[#1E1B26]">Create New Project</h3>
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

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  Project Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Core Settlement Engine Migration"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  Client Organization <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="e.g. Apex Financial"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objectives, deliverables, and scope..."
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {user?.role === 'ADMIN' ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                      Assigned Team <span className="text-[#DC2626]">*</span>
                    </label>
                    <select
                      required
                      value={teamId}
                      onChange={(e) => {
                        const newTeamId = e.target.value;
                        setTeamId(newTeamId);
                        const selTeam = teams.find((t) => t._id === newTeamId);
                        if (selTeam?.managerId) {
                          const m = selTeam.managerId;
                          const mId =
                            typeof m === 'string'
                              ? m
                              : '_id' in m
                              ? m._id
                              : (m as { id?: string }).id;
                          setManagerId(mId || '');
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                    >
                      <option value="">Select a team</option>
                      {teams.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                      Assigned Team
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Your Assigned Team"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#5B616E] cursor-not-allowed"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                    Assigned Manager
                  </label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                  >
                    <option value="">Default to team manager</option>
                    {managers.map((m) => {
                      const id = m.id || (m as unknown as { _id: string })._id;
                      return (
                        <option key={id} value={id}>
                          {m.name} ({m.email})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                    Start Date <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={todayString}
                    value={startDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val < todayString) {
                        setError('Start date cannot be in the past');
                      } else if (error === 'Start date cannot be in the past') {
                        setError(null);
                      }
                      setStartDate(val);
                      if (endDate && val && endDate < val) {
                        setEndDate(val);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                    End Date (Deadline) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={startDate && startDate >= todayString ? startDate : todayString}
                    value={endDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val < todayString) {
                        setError('End date cannot be in the past');
                      } else if (startDate && val && val < startDate) {
                        setError('End date must be greater than or equal to start date');
                      } else if (
                        error === 'End date cannot be in the past' ||
                        error === 'End date must be greater than or equal to start date'
                      ) {
                        setError(null);
                      }
                      setEndDate(val);
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                  />
                </div>
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
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {projectToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-lg w-full p-6 animate-pop-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4400CE] to-[#290660] flex items-center justify-center text-white">
                  <Edit3 className="w-4 h-4 text-[#FF6B00]" />
                </div>
                <h3 className="text-base font-bold font-heading text-[#1E1B26]">Edit Project</h3>
              </div>
              <button
                type="button"
                onClick={() => setProjectToEdit(null)}
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
                  Project Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Core Settlement Engine Migration"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  Client Organization <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editClient}
                  onChange={(e) => setEditClient(e.target.value)}
                  placeholder="e.g. Apex Financial"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Objectives, deliverables, and scope..."
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {user?.role === 'ADMIN' ? (
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
                      <option value="">Select a team</option>
                      {teams.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                      Assigned Team
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Your Assigned Team"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#5B616E] cursor-not-allowed"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                    Assigned Manager
                  </label>
                  <select
                    value={editManagerId}
                    onChange={(e) => setEditManagerId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                  >
                    <option value="">No Manager / Team Default</option>
                    {managers.map((m) => {
                      const id = m.id || (m as unknown as { _id: string })._id;
                      return (
                        <option key={id} value={id}>
                          {m.name} ({m.email})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                    Start Date <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={editStartDate && editStartDate < todayString ? editStartDate : todayString}
                    value={editStartDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val < todayString && val !== initialStartDate) {
                        setEditError('Start date cannot be in the past');
                      } else if (editError === 'Start date cannot be in the past') {
                        setEditError(null);
                      }
                      setEditStartDate(val);
                      if (editEndDate && val && editEndDate < val) {
                        setEditEndDate(val);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                    End Date (Deadline) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={
                      editStartDate && editStartDate >= todayString
                        ? editStartDate
                        : editEndDate && editEndDate < todayString
                        ? editEndDate
                        : todayString
                    }
                    value={editEndDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val < todayString && val !== initialEndDate) {
                        setEditError('End date cannot be in the past');
                      } else if (editStartDate && val && val < editStartDate) {
                        setEditError('End date must be greater than or equal to start date');
                      } else if (
                        editError === 'End date cannot be in the past' ||
                        editError === 'End date must be greater than or equal to start date'
                      ) {
                        setEditError(null);
                      }
                      setEditEndDate(val);
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B26] mb-1 font-heading">
                  Project Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
                <p className="text-[11px] text-[#5B616E] mt-1">
                  Archived projects are locked from further task creation and updates.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setProjectToEdit(null)}
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
