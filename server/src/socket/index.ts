import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { COOKIE_NAMES } from '../config/constants.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../modules/users/user.model.js';
import { setSocketInstance } from './socketEmitter.js';

export const initializeSocket = (httpServer: HttpServer): Server => {
  const allowedOrigins = env.CLIENT_URL.includes(',')
    ? env.CLIENT_URL.split(',').map((o) => o.trim())
    : env.CLIENT_URL;

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      let token: string | undefined;

      // Extract from cookie header
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split('; ').map((c) => {
            const [k, ...v] = c.split('=');
            return [k, decodeURIComponent(v.join('='))];
          })
        );
        token = cookies[COOKIE_NAMES.ACCESS_TOKEN];
      }

      // Fallback to handshake auth object
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.userId);

      if (!user || !user.isActive) {
        return next(new Error('User account is inactive or not found'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Socket authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    const userRoom = `user:${user._id.toString()}`;
    socket.join(userRoom);
    logger.info(`Socket connected: ${socket.id} joined room ${userRoom}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  setSocketInstance(io);
  return io;
};
