import { Schema, model, Document, Types } from 'mongoose';
import { TASK_PRIORITY, TASK_STATUS, TaskPriority, TaskStatus } from '../../config/constants.js';

export interface IAttachment {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export interface ITask {
  title: string;
  description?: string;
  projectId: Types.ObjectId;
  teamId: Types.ObjectId;
  assigneeId: Types.ObjectId;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  completedAt?: Date;
  attachments: IAttachment[];
  lastDueReminderSentAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface ITaskDocument extends ITask, Document {
  _id: Types.ObjectId;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    id: { type: String, required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const taskSchema = new Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 5000,
      trim: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.TODO,
    },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITY),
      default: TASK_PRIORITY.MEDIUM,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    lastDueReminderSentAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: '__v',
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        return ret;
      },
    },
  }
);

taskSchema.index({ teamId: 1, status: 1 });
taskSchema.index({ assigneeId: 1, status: 1 });
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1, lastDueReminderSentAt: 1 });

export const Task = model<ITaskDocument>('Task', taskSchema);
