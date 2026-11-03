import { Schema, model, Document, Types } from 'mongoose';
import { ACTIVITY_ACTION, ActivityAction } from '../../config/constants.js';

export interface IActivity {
  taskId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: ActivityAction;
  details?: {
    isOverride?: boolean;
    [key: string]: unknown;
  };
  oldValue?: string;
  newValue?: string;
  reason?: string;
  createdAt: Date;
}

export interface IActivityDocument extends IActivity, Document {
  _id: Types.ObjectId;
}

const activitySchema = new Schema<IActivityDocument>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(ACTIVITY_ACTION),
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    oldValue: {
      type: String,
      default: null,
    },
    newValue: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

activitySchema.index({ taskId: 1, createdAt: -1 });
activitySchema.index({ actorId: 1, createdAt: -1 });

export const Activity = model<IActivityDocument>('Activity', activitySchema);
