import { Schema, model, Document, Types } from 'mongoose';

export interface IComment {
  taskId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommentDocument extends IComment, Document {
  _id: Types.ObjectId;
}

const commentSchema = new Schema<ICommentDocument>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
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

commentSchema.index({ taskId: 1, createdAt: 1 });

export const Comment = model<ICommentDocument>('Comment', commentSchema);
