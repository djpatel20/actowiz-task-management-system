import multer from 'multer';

// Use memory storage so we can validate magic bytes before writing to disk
const storage = multer.memoryStorage();

export const uploadAttachmentMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 1,
  },
}).single('file');
