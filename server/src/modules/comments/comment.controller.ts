import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/index.js';
import { CommentService } from './comment.service.js';

export class CommentController {
  static async listTaskComments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const comments = await CommentService.listTaskComments(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const comment = await CommentService.addComment(req.params.id, req.body.content, req.user!);
      res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }
}
