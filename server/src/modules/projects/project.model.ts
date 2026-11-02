import { Schema, model, Document, Types } from 'mongoose';
import { PROJECT_STATUS, ProjectStatus } from '../../config/constants.js';

export interface IProject {
  name: string;
  description?: string;
  client: string;
  startDate: Date;
  endDate: Date;
  teamId: Types.ObjectId;
  status: ProjectStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectDocument extends IProject, Document {
  _id: Types.ObjectId;
}

const projectSchema = new Schema<IProjectDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    description: {
      type: String,
      maxlength: 2000,
      trim: true,
    },
    client: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.ACTIVE,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

projectSchema.index({ teamId: 1, status: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ startDate: 1, endDate: 1 });

export const Project = model<IProjectDocument>('Project', projectSchema);
