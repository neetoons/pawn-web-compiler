import multer from 'multer';
import path from 'path';
import { CONFIG } from '../config/index.js';

const storage = multer.diskStorage({
  destination: CONFIG.PATHS.UPLOADS,
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const name = path.parse(file.originalname).name;
    cb(null, `${name}-${timestamp}.zip`);
  }
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.zip') {
    cb(new Error('Only .zip files are allowed'));
    return;
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: CONFIG.FILE_LIMITS.MAX_SIZE
  }
});