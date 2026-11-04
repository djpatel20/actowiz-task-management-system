import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/index.js';
import { TaskService } from './task.service.js';
import { TaskWorkflowService } from './taskWorkflow.service.js';
import { TaskExportService } from './taskExport.service.js';

export class TaskController {
  static async listTasks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TaskService.listTasks(req.user!, req.query as never);
      res.status(200).json({
        success: true,
        data: result.tasks,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTaskById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.getTaskById(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.createTask(req.body, req.user!);
      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.updateTask(req.params.id, req.body, req.user!);
      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TaskService.deleteTask(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async transitionStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, version, rejectionReason } = req.body;
      const updatedTask = await TaskWorkflowService.transitionStatus(
        req.params.id,
        status,
        req.user!,
        version,
        rejectionReason
      );

      res.status(200).json({
        success: true,
        data: updatedTask,
      });
    } catch (error) {
      next(error);
    }
  }

  static async exportCsv(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await TaskExportService.exportTasksCsv(res, req.user!, req.query as never);
    } catch (error) {
      next(error);
    }
  }

  static async uploadAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const attachment = await TaskService.uploadAttachment(req.params.id, req.file, req.user!);
      res.status(201).json({
        success: true,
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listAttachments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const attachments = await TaskService.listAttachments(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: attachments,
      });
    } catch (error) {
      next(error);
    }
  }

  static async downloadAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { filePath, originalName, mimeType } = await TaskService.getAttachmentForDownload(
        req.params.id,
        req.params.attachmentId,
        req.user!
      );
      res.setHeader('Content-Type', mimeType);
      res.download(filePath, originalName);
    } catch (error) {
      next(error);
    }
  }

  static async deleteAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await TaskService.deleteAttachment(req.params.id, req.params.attachmentId, req.user!);
      res.status(200).json({
        success: true,
        data: { message: 'Attachment deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}
