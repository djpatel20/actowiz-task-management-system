import { Schema, model, Document, Types } from 'mongoose';

export interface ITeam {
  name: string;
  description?: string;
  managerId?: Types.ObjectId;
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
      unique: true,
      sparse: true,
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

export const Team = model<ITeamDocument>('Team', teamSchema);
