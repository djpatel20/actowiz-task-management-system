import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './shared/errors/AppError.js';

import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import teamRoutes from './modules/teams/team.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';
import commentRoutes from './modules/comments/comment.routes.js';
import activityRoutes from './modules/activity/activity.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';

export const createApp = (): express.Application => {
  const app = express();

  // Trust reverse proxies (needed for Docker, Render, rate-limiter, cookies)
  app.set('trust proxy', 1);

  const allowedOrigins = env.CLIENT_URL.includes(',')
    ? env.CLIENT_URL.split(',').map((o) => o.trim())
    : env.CLIENT_URL;

  // Security middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body parsing & cookies
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Rate limiting
  app.use(generalLimiter);

  // CSRF protection on state-changing requests
  app.use(csrfProtection);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // Feature routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api', commentRoutes); // provides /api/tasks/:id/comments
  app.use('/api', activityRoutes); // provides /api/tasks/:id/activity
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // 404 Handler for undefined routes
  app.use((_req, _res, next) => {
    next(new NotFoundError('API route not found'));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
