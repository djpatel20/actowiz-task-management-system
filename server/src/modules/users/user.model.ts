import { Schema, model, Document, Types } from 'mongoose';
import { USER_ROLES, UserRole } from '../../config/constants.js';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  teamId?: Types.ObjectId;
  teamIds?: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never return password hashes by default
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    teamIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Team',
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, teamId: 1 });
userSchema.index({ role: 1, teamIds: 1 });
userSchema.index({ isActive: 1 });

export const User = model<IUserDocument>('User', userSchema);
