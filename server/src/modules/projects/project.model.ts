import { Schema, model, Document, Types } from 'mongoose';
import { PROJECT_STATUS, ProjectStatus } from '../../config/constants.js';

export interface IProject {
  name: string;
  description?: string;
  client: string;
  startDate: Date;
  endDate: Date;
  teamId: Types.ObjectId;
  managerId?: Types.ObjectId;
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
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
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

projectSchema.pre('save', async function (next) {
  if (!this.managerId && this.teamId) {
    try {
      const TeamModel = model('Team');
      const team = await TeamModel.findById(this.teamId);
      if (team?.managerId) {
        this.managerId = team.managerId;
      }
    } catch {
      // Continue if Team model not yet loaded
    }
  }
  next();
});

projectSchema.index({ teamId: 1, status: 1 });
projectSchema.index({ managerId: 1 });
projectSchema.index({ client: 1 });
projectSchema.index({ startDate: 1, endDate: 1 });

export const Project = model<IProjectDocument>('Project', projectSchema);
