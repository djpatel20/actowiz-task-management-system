import { Server } from 'socket.io';
import { Types } from 'mongoose';
import { logger } from '../utils/logger.js';

let ioInstance: Server | null = null;

export const setSocketInstance = (io: Server): void => {
  ioInstance = io;
};

export const getSocketInstance = (): Server | null => {
  return ioInstance;
};

export const socketEmitter = {
  toUser: (userId: string | Types.ObjectId, event: string, payload: unknown): void => {
    if (!ioInstance) {
      logger.debug(`[SocketEmitter] Server not attached. Skipping emit to user:${userId.toString()}`);
      return;
    }
    const room = `user:${userId.toString()}`;
    ioInstance.to(room).emit(event, payload);
    logger.debug(`[SocketEmitter] Emitted '${event}' to ${room}`);
  },
};
