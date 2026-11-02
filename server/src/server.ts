import http from 'http';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { initializeSocket } from './socket/index.js';
import { startDueSoonScheduler, stopDueSoonScheduler } from './modules/notifications/notification.scheduler.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  try {
    await connectDatabase();

    const app = createApp();
    const server = http.createServer(app);

    // Initialize real-time Socket.IO
    initializeSocket(server);

    // Initialize due-soon background scheduler
    startDueSoonScheduler();

    server.listen(env.PORT, () => {
      logger.info(`Actowiz Server running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`REST API: http://localhost:${env.PORT}/api`);
      logger.info(`WebSocket: ws://localhost:${env.PORT}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} signal received. Closing HTTP server and schedulers...`);
      stopDueSoonScheduler();
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
