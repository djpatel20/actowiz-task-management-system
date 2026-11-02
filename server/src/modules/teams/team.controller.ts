import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/index.js';
import { TeamService } from './team.service.js';

export class TeamController {
  static async listTeams(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TeamService.listTeams(req.user!, req.query as never);
      res.status(200).json({
        success: true,
        data: result.teams,
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

  static async getTeamById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const team = await TeamService.getTeamById(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: team,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createTeam(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const team = await TeamService.createTeam(req.body);
      res.status(201).json({
        success: true,
        data: team,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTeam(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const team = await TeamService.updateTeam(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: team,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTeamMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const members = await TeamService.getTeamMembers(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }
}
