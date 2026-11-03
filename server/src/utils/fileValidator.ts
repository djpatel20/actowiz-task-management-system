import { fileTypeFromBuffer } from 'file-type';
import { BadRequestError } from '../shared/errors/AppError.js';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
];

export const validateFileBuffer = async (
  buffer: Buffer,
  originalMimeType: string
): Promise<{ mime: string; ext: string }> => {
  const detected = await fileTypeFromBuffer(buffer);

  // If detected by binary magic bytes
  if (detected) {
    if (!ALLOWED_MIME_TYPES.includes(detected.mime)) {
      throw new BadRequestError(
        `Unsupported or potentially dangerous file type: ${detected.mime}. Allowed types: PDF, PNG, JPEG, ZIP, DOCX, XLSX`
      );
    }
    return { mime: detected.mime, ext: detected.ext };
  }

  // Fallback for plain text files or fallback check
  if (originalMimeType === 'text/plain') {
    return { mime: 'text/plain', ext: 'txt' };
  }

  throw new BadRequestError('Unable to verify file binary content. Upload rejected.');
};
