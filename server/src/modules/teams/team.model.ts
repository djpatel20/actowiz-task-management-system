import { Schema, model, Document, Types } from 'mongoose';

export interface ITeam {
  name: string;
  description?: string;
  managerId?: Types.ObjectId;
  managerIds?: Types.ObjectId[];
  memberIds?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeamDocument extends ITeam, Document {
  _id: Types.ObjectId;
}

const teamSchema = new Schema<ITeamDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    managerIds: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    memberIds: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
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

teamSchema.index({ managerIds: 1 });
teamSchema.index({ memberIds: 1 });

export const Team = model<ITeamDocument>('Team', teamSchema);
