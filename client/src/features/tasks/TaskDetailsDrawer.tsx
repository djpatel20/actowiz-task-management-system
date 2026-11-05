import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from './tasksApi.js';
import { teamsApi } from '../teams/teamsApi.js';
import { useAuth } from '../auth/AuthContext.js';
import { Task, UserRole, TaskStatus } from '../../types/index.js';
import { format, formatDistanceToNow } from 'date-fns';
import {
  X,
  Calendar,
  CheckCircle2,
  MessageSquare,
  History,
  Paperclip,
  Download,
  Trash2,
  AlertTriangle,
  Send,
  Upload,
} from 'lucide-react';
import { getApiErrorMessage } from '../../lib/errors.js';

const safeFormat = (date: unknown, formatStr: string, fallback = 'N/A'): string => {
  if (!date) return fallback;
  try {
    const d = new Date(date as string | number | Date);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
};

const safeDistanceToNow = (date: unknown, fallback = 'Recently'): string => {
  if (!date) return fallback;
  try {
    const d = new Date(date as string | number | Date);
    if (isNaN(d.getTime())) return fallback;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return fallback;
  }
};

interface TaskDetailsDrawerProps {
  taskId: string | null;
  onClose: () => void;
  userRole?: UserRole;
  currentUserId?: string;
  onTransition?: (task: Task, status: TaskStatus) => void;
}

export const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({
  taskId,
  onClose,
  userRole,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'activity' | 'attachments'>('overview');
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: task, isLoading: isTaskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.getTaskById(taskId!),
    enabled: !!taskId,
    initialData: () => {
      if (!taskId) return undefined;
      const cached = queryClient.getQueryData<Task>(['task', taskId]);
      if (cached) return cached;
      const tasksQueries = queryClient.getQueriesData<{ tasks?: Task[] }>({ queryKey: ['tasks'] });
      for (const [, qData] of tasksQueries) {
        if (qData?.tasks && Array.isArray(qData.tasks)) {
          const found = qData.tasks.find((t) => t._id === taskId);
          if (found) return found;
        }
      }
      return undefined;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => tasksApi.listComments(taskId!),
    enabled: !!taskId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['task-activities', taskId],
    queryFn: () => tasksApi.listActivities(taskId!),
    enabled: !!taskId && activeTab === 'activity',
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => tasksApi.addComment(taskId!, content),
    onSuccess: () => {
      setNewComment('');
      setCommentError(null);
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', taskId] });
    },
    onError: (err: unknown) => {
      setCommentError(getApiErrorMessage(err, 'Failed to add comment'));
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => tasksApi.uploadAttachment(taskId!, file),
    onSuccess: () => {
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', taskId] });
    },
    onError: (err: unknown) => {
      setUploadError(getApiErrorMessage(err, 'Upload failed'));
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => tasksApi.deleteAttachment(taskId!, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', taskId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: () => tasksApi.deleteTask(taskId!),
    onSuccess: () => {
      setIsConfirmingDelete(false);
      onClose();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: unknown) => {
      setDeleteError(getApiErrorMessage(err, 'Failed to delete task'));
    },
  });

  const reassignMutation = useMutation({
    mutationFn: (newAssigneeId: string) =>
      tasksApi.updateTask(taskId!, { assigneeId: newAssigneeId }),
    onSuccess: () => {
      setIsReassigning(false);
      setReassignError(null);
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', taskId] });
    },
    onError: (err: unknown) => {
      setReassignError(getApiErrorMessage(err, 'Failed to reassign task'));
    },
  });

  const taskTeamId = task?.teamId
    ? typeof task.teamId === 'string'
      ? task.teamId
      : (task.teamId as { _id?: string })._id
    : '';

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', taskTeamId],
    queryFn: () => teamsApi.getTeamMembers(taskTeamId!),
    enabled: !!taskId && !!taskTeamId && isReassigning,
  });

  if (!taskId) return null;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setCommentError('Comment cannot be empty');
      return;
    }
    setCommentError(null);
    addCommentMutation.mutate(newComment.trim());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds the 10 MB limit');
      return;
    }
    uploadAttachmentMutation.mutate(file);
    e.target.value = '';
  };

  const project = task?.projectId as { name?: string; client?: string; managerId?: string | { _id?: string; id?: string } };
  const assignee = task?.assigneeId as { _id?: string; name?: string; email?: string; role?: string };
  const creator = task?.createdBy as { _id?: string; name?: string; email?: string } | undefined;


  const pManagerId = project?.managerId
    ? typeof project.managerId === 'string'
      ? project.managerId
      : (project.managerId._id || project.managerId.id)
    : null;

  const isProjectManager = Boolean(
    pManagerId
      ? (pManagerId === currentUserId || pManagerId === user?._id || pManagerId === user?.id)
      : (taskTeamId && user?.teamId && taskTeamId === user.teamId)
  );

  const canManageTask =
    userRole === 'ADMIN' ||
    (userRole === 'MANAGER' && isProjectManager);

  if (!task && !isTaskLoading) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-fade-in" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-xl bg-white border-l border-[#E2E8F0] shadow-2xl flex flex-col p-8 items-center justify-center space-y-4 animate-slide-up">
            <AlertTriangle className="w-12 h-12 text-[#FF6B00]" />
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold font-heading text-[#1E1B26]">Task details unavailable</h3>
              <p className="text-xs text-[#5B616E]">This task may not exist or you do not have permission to view it.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#290660] hover:bg-[#1F044A] text-white text-xs font-semibold rounded-lg shadow-acto-purple transition-all font-heading"
            >
              Close Drawer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-fade-in" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white border-l border-[#E2E8F0] shadow-2xl flex flex-col animate-slide-up">
          {/* Header */}
          <div className="p-5 border-b border-[#E2E8F0] flex items-start justify-between bg-[#F8FAFC]">
            <div className="space-y-1.5 pr-4">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase text-[#4400CE] bg-[#4400CE]/10 border-[#4400CE]/20 font-heading">
                  {task?.status ? task.status.replace('_', ' ') : 'TODO'}
                </span>
                <span className="text-xs text-[#5B616E]">
                  {project?.name || 'Project'} {project?.client ? `• ${project.client}` : ''}
                </span>
              </div>
              <h2 className="text-lg font-bold font-heading text-[#1E1B26] leading-snug">
                {task?.title || 'Task Details'}
              </h2>
            </div>
            <div className="flex items-center space-x-1">
              {canManageTask && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setIsConfirmingDelete(true);
                  }}
                  className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] rounded-lg hover:bg-[#FEF2F2] transition-colors"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#94A3B8] hover:text-[#1E1B26] rounded-lg hover:bg-[#F1F5F9] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-[#E2E8F0] px-5 space-x-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 border-b-2 font-heading transition-colors ${
                activeTab === 'overview'
                  ? 'border-[#4400CE] text-[#4400CE]'
                  : 'border-transparent text-[#5B616E] hover:text-[#1E1B26]'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`py-3 border-b-2 font-heading transition-colors flex items-center space-x-1.5 ${
                activeTab === 'comments'
                  ? 'border-[#4400CE] text-[#4400CE]'
                  : 'border-transparent text-[#5B616E] hover:text-[#1E1B26]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comments ({comments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`py-3 border-b-2 font-heading transition-colors flex items-center space-x-1.5 ${
                activeTab === 'activity'
                  ? 'border-[#4400CE] text-[#4400CE]'
                  : 'border-transparent text-[#5B616E] hover:text-[#1E1B26]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Activity Log</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`py-3 border-b-2 font-heading transition-colors flex items-center space-x-1.5 ${
                activeTab === 'attachments'
                  ? 'border-[#4400CE] text-[#4400CE]'
                  : 'border-transparent text-[#5B616E] hover:text-[#1E1B26]'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments ({task?.attachments?.length || 0})</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {isTaskLoading && !task ? (
              <div className="py-20 text-center text-xs text-[#94A3B8]">Loading task details...</div>
            ) : activeTab === 'overview' ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B616E] mb-2 font-heading">
                    Description
                  </h4>
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#1E1B26] leading-relaxed whitespace-pre-wrap font-sans">
                    {task?.description || 'No description provided.'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-[#5B616E] uppercase font-heading">
                      <span>Assignee</span>
                      {canManageTask && !isReassigning && (
                        <button
                          type="button"
                          onClick={() => setIsReassigning(true)}
                          className="text-[#4400CE] hover:underline normal-case font-semibold text-[11px]"
                        >
                          Reassign
                        </button>
                      )}
                    </div>
                    {isReassigning ? (
                      <div className="mt-2 space-y-1.5">
                        {reassignError && (
                          <div className="p-2 rounded bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-[11px]">
                            {reassignError}
                          </div>
                        )}
                        <select
                          defaultValue={assignee?._id || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              reassignMutation.mutate(e.target.value);
                            }
                          }}
                          className="w-full px-2 py-1 bg-white border border-[#E2E8F0] rounded text-xs text-[#1E1B26] focus:outline-none focus:ring-1 focus:ring-[#4400CE]"
                        >
                          <option value="" disabled>Select member</option>
                          {teamMembers.map((m) => {
                            const id = m.id || (m as unknown as { _id: string })._id;
                            return (
                              <option key={id} value={id}>
                                {m.name} ({m.role})
                              </option>
                            );
                          })}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsReassigning(false)}
                          className="text-[10px] text-[#94A3B8] hover:text-[#1E1B26]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-[#1E1B26] mt-1.5 flex items-center justify-between">
                        <div className="flex items-center space-x-2 truncate">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4400CE] to-[#290660] text-white flex items-center justify-center font-bold text-[10px] shadow-2xs">
                            {assignee?.name?.charAt(0) || 'U'}
                          </div>
                          <span className="truncate">{assignee?.name || 'Unassigned'}</span>
                        </div>
                        {assignee?.role && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase text-[#4400CE] bg-[#4400CE]/10 border-[#4400CE]/20 shrink-0">
                            {assignee.role}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div className="text-[10px] font-semibold text-[#5B616E] uppercase font-heading">Priority</div>
                    <div className="text-xs font-bold text-[#1E1B26] mt-1.5 font-heading">
                      {task?.priority}
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div className="text-[10px] font-semibold text-[#5B616E] uppercase font-heading">Due Date</div>
                    <div className="text-xs font-semibold text-[#1E1B26] mt-1.5 flex items-center space-x-1.5 font-sans">
                      <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>{safeFormat(task?.dueDate, 'PPP')}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div className="text-[10px] font-semibold text-[#5B616E] uppercase font-heading">Created By</div>
                    <div className="text-xs font-semibold text-[#1E1B26] mt-1.5 flex items-center justify-between font-sans">
                      <span className="truncate">{creator?.name || 'System'}</span>
                      <span className="text-[10px] text-[#94A3B8] font-normal" title="Optimistic Concurrency Version">v{task?.__v ?? 0}</span>
                    </div>
                  </div>
                </div>

                {task?.completedAt && (
                  <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-xs flex items-center space-x-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Completed permanently on {safeFormat(task.completedAt, 'PPP p')}
                    </span>
                  </div>
                )}

                {/* Instant Comments & Discussion in Overview */}
                <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B616E] font-heading flex items-center space-x-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#4400CE]" />
                      <span>Comments & Discussion ({comments.length})</span>
                    </h4>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <div className="text-center py-4 bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0] text-xs text-[#94A3B8]">
                        No comments yet. Start the conversation below.
                      </div>
                    ) : (
                      comments.map((c) => {
                        const author = c.authorId as { name?: string; role?: string };
                        return (
                          <div
                            key={c._id}
                            className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-[#1E1B26] font-heading">{author?.name || 'User'}</span>
                              <span className="text-[10px] text-[#94A3B8] font-sans">
                                {safeDistanceToNow(c.createdAt)}
                              </span>
                            </div>
                            <p className="text-[#1E1B26] leading-relaxed whitespace-pre-wrap font-sans">
                              {c.content}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleCommentSubmit} className="pt-1">
                    {commentError && (
                      <div className="mb-2 p-2 rounded bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-[11px]">
                        {commentError}
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                      />
                      <button
                        type="submit"
                        disabled={addCommentMutation.isPending || !newComment.trim()}
                        className="p-2 bg-gradient-to-r from-[#4400CE] to-[#290660] text-white rounded-lg hover:from-[#3B00B5] hover:to-[#1F044A] shadow-acto-purple active:scale-[0.98] transition-all disabled:opacity-50"
                        title="Send comment"
                      >
                        <Send className="w-4 h-4 text-[#FF6B00]" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : activeTab === 'comments' ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 space-y-3 overflow-y-auto pr-1 mb-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-12 text-xs text-[#94A3B8]">
                      No comments yet. Start the conversation.
                    </div>
                  ) : (
                    comments.map((c) => {
                      const author = c.authorId as { name?: string; role?: string };
                      return (
                        <div
                          key={c._id}
                          className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-[#1E1B26] font-heading">{author?.name}</span>
                            <span className="text-[10px] text-[#94A3B8] font-sans">
                              {safeDistanceToNow(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-[#1E1B26] leading-relaxed whitespace-pre-wrap font-sans">
                            {c.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleCommentSubmit} className="pt-3 border-t border-[#E2E8F0]">
                  {commentError && (
                    <div className="mb-2 p-2 rounded bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-[11px]">
                      {commentError}
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#1E1B26] focus:outline-none focus:ring-2 focus:ring-[#290660]/20 focus:border-[#290660] transition-all"
                    />
                    <button
                      type="submit"
                      disabled={addCommentMutation.isPending || !newComment.trim()}
                      className="p-2 bg-gradient-to-r from-[#4400CE] to-[#290660] text-white rounded-lg hover:from-[#3B00B5] hover:to-[#1F044A] shadow-acto-purple active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 text-[#FF6B00]" />
                    </button>
                  </div>
                </form>
              </div>
            ) : activeTab === 'activity' ? (
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[#94A3B8]">No activities logged.</div>
                ) : (
                  activities.map((a) => {
                    const actor = a.actorId as { name?: string; role?: string };
                    return (
                      <div
                        key={a._id}
                        className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1E1B26] font-heading">{actor?.name}</span>
                          <span className="text-[10px] text-[#94A3B8] font-sans">
                            {safeFormat(a.createdAt, 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <div className="text-xs text-[#5B616E]">
                          {a.action === 'STATUS_CHANGED' && (
                            <span>
                              Changed status from <strong className="text-[#1E1B26]">{a.oldValue}</strong> to{' '}
                              <strong className="text-[#4400CE]">{a.newValue}</strong>
                            </span>
                          )}
                          {a.action === 'REVIEW_REJECTED' && (
                            <div className="text-[#DC2626]">
                              Rejected review back to <strong className="text-[#1E1B26]">{a.newValue}</strong>
                              {a.reason && <p className="mt-1 italic text-[#1E1B26]">"{a.reason}"</p>}
                            </div>
                          )}
                          {a.action === 'TASK_CREATED' && <span>Created the task.</span>}
                          {a.action === 'COMMENT_ADDED' && <span>Posted a comment.</span>}
                          {a.action === 'ATTACHMENT_ADDED' && <span>Uploaded an attachment.</span>}
                          {a.action === 'ATTACHMENT_DELETED' && <span>Deleted an attachment.</span>}
                          {a.action === 'TASK_REASSIGNED' && <span>Reassigned the task.</span>}
                          {a.action === 'TASK_UPDATED' && <span>Updated task details.</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Upload File Box */}
                <div className="p-4 border-2 border-dashed border-[#E2E8F0] rounded-xl text-center hover:border-[#4400CE] hover:bg-[#F8FAFC] transition-all">
                  <label className="cursor-pointer block">
                    <Upload className="w-6 h-6 text-[#94A3B8] mx-auto mb-2" />
                    <span className="text-xs font-semibold text-[#0071CE] hover:underline font-heading">
                      Upload attachment
                    </span>
                    <span className="text-xs text-[#5B616E]"> (max 10 MB)</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.zip,.docx,.xlsx,.txt"
                    />
                  </label>
                  <p className="text-[10px] text-[#94A3B8] mt-1 font-sans">
                    Magic-bytes verified: PDF, PNG, JPEG, ZIP, DOCX
                  </p>
                </div>

                {uploadError && (
                  <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs">
                    {uploadError}
                  </div>
                )}

                {/* Attachments List */}
                <div className="space-y-2">
                  {!task?.attachments || task.attachments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#94A3B8]">
                      No attachments uploaded.
                    </div>
                  ) : (
                    task.attachments.map((att) => {
                      const uploadedById =
                        typeof att.uploadedBy === 'string'
                          ? att.uploadedBy
                          : (att.uploadedBy as { _id?: string; id?: string })?._id ||
                            (att.uploadedBy as { _id?: string; id?: string })?.id;
                      const canDelete =
                        userRole === 'ADMIN' ||
                        userRole === 'MANAGER' ||
                        uploadedById === currentUserId;

                      return (
                        <div
                          key={att.id}
                          className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-semibold text-[#1E1B26] truncate font-heading">
                              {att.originalName}
                            </div>
                            <div className="text-[10px] text-[#94A3B8]">
                              {(att.size / 1024).toFixed(1)} KB &bull; {att.mimeType}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <a
                              href={`http://localhost:5000${att.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-[#5B616E] hover:text-[#4400CE] rounded hover:bg-[#E2E8F0] transition-colors"
                              title="Download attachment"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => deleteAttachmentMutation.mutate(att.id)}
                                className="p-1.5 text-[#5B616E] hover:text-[#DC2626] rounded hover:bg-[#E2E8F0] transition-colors"
                                title="Delete attachment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Delete Task Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-acto-lg max-w-sm w-full p-5 animate-pop-in">
            <div className="flex items-center space-x-2 text-[#DC2626] mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold font-heading text-[#1E1B26]">Delete Task</h3>
            </div>
            <p className="text-xs text-[#5B616E] leading-relaxed mb-4">
              Are you sure you want to delete <span className="font-bold text-[#1E1B26]">{task?.title}</span>? 
              This will remove all associated comments, attachments, and activity history permanently.
            </p>
            {deleteError && (
              <div className="mb-3 p-2 rounded bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs">
                {deleteError}
              </div>
            )}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={deleteTaskMutation.isPending}
                className="px-3 py-1.5 text-xs font-semibold text-[#5B616E] hover:text-[#1E1B26] hover:bg-[#F1F5F9] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTaskMutation.mutate()}
                disabled={deleteTaskMutation.isPending}
                className="px-3.5 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 font-heading"
              >
                {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
