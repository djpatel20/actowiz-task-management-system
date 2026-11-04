import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from './tasksApi.js';
import { Task, UserRole, TaskStatus } from '../../types/index.js';
import { format, formatDistanceToNow } from 'date-fns';
import {
  X,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  History,
  Paperclip,
  Download,
  Trash2,
  Send,
  Upload,
} from 'lucide-react';

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
  onTransition,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'activity' | 'attachments'>('overview');
  const [newComment, setNewComment] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: task, isLoading: isTaskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.getTaskById(taskId!),
    enabled: !!taskId,
  });

  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => tasksApi.listComments(taskId!),
    enabled: !!taskId && activeTab === 'comments',
  });

  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['task-activities', taskId],
    queryFn: () => tasksApi.listActivities(taskId!),
    enabled: !!taskId && activeTab === 'activity',
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => tasksApi.addComment(taskId!, content),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', taskId] });
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
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Upload failed';
      setUploadError(msg);
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => tasksApi.deleteAttachment(taskId!, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', taskId] });
    },
  });

  if (!taskId) return null;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
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

  const project = task?.projectId as { name?: string; client?: string };
  const assignee = task?.assigneeId as { _id?: string; name?: string; email?: string };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white border-l border-[#E5E6E1] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-[#E5E6E1] flex items-start justify-between">
            <div className="space-y-1 pr-4">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase text-[#5556A6] bg-[#5556A6]/10 border-[#5556A6]/20">
                  {task?.status?.replace('_', ' ')}
                </span>
                <span className="text-xs text-[#777B76]">
                  {project?.name} &bull; {project?.client}
                </span>
              </div>
              <h2 className="text-base font-semibold text-[#252824] leading-snug">
                {task?.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#969A94] hover:text-[#252824] rounded-lg hover:bg-[#F0F0EC] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-[#E5E6E1] px-5 space-x-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-[#5556A6] text-[#5556A6] font-semibold'
                  : 'border-transparent text-[#777B76] hover:text-[#252824]'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'comments'
                  ? 'border-[#5556A6] text-[#5556A6] font-semibold'
                  : 'border-transparent text-[#777B76] hover:text-[#252824]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comments</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'activity'
                  ? 'border-[#5556A6] text-[#5556A6] font-semibold'
                  : 'border-transparent text-[#777B76] hover:text-[#252824]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Activity Log</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'attachments'
                  ? 'border-[#5556A6] text-[#5556A6] font-semibold'
                  : 'border-transparent text-[#777B76] hover:text-[#252824]'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments ({task?.attachments?.length || 0})</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {isTaskLoading ? (
              <div className="py-20 text-center text-xs text-[#969A94]">Loading task details...</div>
            ) : activeTab === 'overview' ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#777B76] mb-2">
                    Description
                  </h4>
                  <div className="p-3.5 bg-[#F7F7F4] rounded-lg border border-[#E5E6E1] text-xs text-[#252824] leading-relaxed whitespace-pre-wrap">
                    {task?.description || 'No description provided.'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[#F7F7F4] rounded-lg border border-[#E5E6E1]">
                    <div className="text-[10px] font-medium text-[#777B76] uppercase">Assignee</div>
                    <div className="text-xs font-semibold text-[#252824] mt-1 flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-full bg-[#E5E6E1] flex items-center justify-center font-bold text-[10px]">
                        {assignee?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="truncate">{assignee?.name || 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F7F7F4] rounded-lg border border-[#E5E6E1]">
                    <div className="text-[10px] font-medium text-[#777B76] uppercase">Priority</div>
                    <div className="text-xs font-semibold text-[#252824] mt-1">
                      {task?.priority}
                    </div>
                  </div>

                  <div className="p-3 bg-[#F7F7F4] rounded-lg border border-[#E5E6E1]">
                    <div className="text-[10px] font-medium text-[#777B76] uppercase">Due Date</div>
                    <div className="text-xs font-semibold text-[#252824] mt-1 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#969A94]" />
                      <span>{task?.dueDate ? format(new Date(task.dueDate), 'PPP') : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F7F7F4] rounded-lg border border-[#E5E6E1]">
                    <div className="text-[10px] font-medium text-[#777B76] uppercase">OCC Version (__v)</div>
                    <div className="text-xs font-semibold text-[#252824] mt-1">
                      v{task?.__v} (Optimistic Concurrency)
                    </div>
                  </div>
                </div>

                {task?.completedAt && (
                  <div className="p-3.5 rounded-lg bg-[#EBF5EE] border border-[#D1EADB] text-[#438568] text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Completed permanently on {format(new Date(task.completedAt), 'PPP p')}
                    </span>
                  </div>
                )}
              </div>
            ) : activeTab === 'comments' ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 space-y-3 overflow-y-auto pr-1 mb-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-12 text-xs text-[#969A94]">
                      No comments yet. Start the conversation.
                    </div>
                  ) : (
                    comments.map((c) => {
                      const author = c.authorId as { name?: string; role?: string };
                      return (
                        <div
                          key={c._id}
                          className="p-3 bg-[#F7F7F4] rounded-lg border border-[#E5E6E1] text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-[#252824]">{author?.name}</span>
                            <span className="text-[10px] text-[#969A94]">
                              {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-[#252824] leading-relaxed whitespace-pre-wrap">
                            {c.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleCommentSubmit} className="pt-3 border-t border-[#E5E6E1]">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 bg-white border border-[#E5E6E1] rounded-lg text-xs text-[#252824] focus:outline-none focus:ring-1 focus:ring-[#5556A6]"
                    />
                    <button
                      type="submit"
                      disabled={addCommentMutation.isPending || !newComment.trim()}
                      className="p-2 bg-[#5556A6] text-white rounded-lg hover:bg-[#45468F] transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            ) : activeTab === 'activity' ? (
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[#969A94]">No activities logged.</div>
                ) : (
                  activities.map((a) => {
                    const actor = a.actorId as { name?: string; role?: string };
                    return (
                      <div
                        key={a._id}
                        className="p-3 bg-[#F7F7F4] rounded-lg border border-[#E5E6E1] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#252824]">{actor?.name}</span>
                          <span className="text-[10px] text-[#969A94]">
                            {format(new Date(a.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <div className="text-xs text-[#777B76]">
                          {a.action === 'STATUS_CHANGED' && (
                            <span>
                              Changed status from <strong className="text-[#252824]">{a.oldValue}</strong> to{' '}
                              <strong className="text-[#252824]">{a.newValue}</strong>
                            </span>
                          )}
                          {a.action === 'REVIEW_REJECTED' && (
                            <div className="text-[#C35D5D]">
                              Rejected review back to <strong className="text-[#252824]">{a.newValue}</strong>
                              {a.reason && <p className="mt-1 italic text-[#252824]">"{a.reason}"</p>}
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
                <div className="p-4 border-2 border-dashed border-[#E5E6E1] rounded-lg text-center hover:border-[#5556A6] transition-colors">
                  <label className="cursor-pointer block">
                    <Upload className="w-6 h-6 text-[#969A94] mx-auto mb-2" />
                    <span className="text-xs font-semibold text-[#5556A6] hover:underline">
                      Upload attachment
                    </span>
                    <span className="text-xs text-[#777B76]"> (max 10 MB)</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.zip,.docx,.xlsx,.txt"
                    />
                  </label>
                  <p className="text-[10px] text-[#969A94] mt-1">
                    Magic-bytes verified: PDF, PNG, JPEG, ZIP, DOCX
                  </p>
                </div>

                {uploadError && (
                  <div className="p-2.5 rounded-lg bg-[#FDF2F2] border border-[#F8D7DA] text-[#C35D5D] text-xs">
                    {uploadError}
                  </div>
                )}

                {/* Attachments List */}
                <div className="space-y-2">
                  {!task?.attachments || task.attachments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#969A94]">
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
                          className="p-3 bg-[#F7F7F4] rounded-lg border border-[#E5E6E1] flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-medium text-[#252824] truncate">
                              {att.originalName}
                            </div>
                            <div className="text-[10px] text-[#969A94]">
                              {(att.size / 1024).toFixed(1)} KB &bull; {att.mimeType}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <a
                              href={`http://localhost:5000${att.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-[#777B76] hover:text-[#5556A6] rounded hover:bg-[#E5E6E1] transition-colors"
                              title="Download attachment"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => deleteAttachmentMutation.mutate(att.id)}
                                className="p-1.5 text-[#777B76] hover:text-[#C35D5D] rounded hover:bg-[#E5E6E1] transition-colors"
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
    </div>
  );
};
