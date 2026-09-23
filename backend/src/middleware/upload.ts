import multer from 'multer';
import { env } from '../config/env';

const ALLOWED_EXTENSIONS = ['.log', '.txt'];

export const uploadLogFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadSizeBytes },
  fileFilter: (_req, file, callback) => {
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext),
    );
    if (!hasAllowedExtension) {
      callback(new Error('Only .log or .txt files are allowed'));
      return;
    }
    callback(null, true);
  },
}).single('file');
