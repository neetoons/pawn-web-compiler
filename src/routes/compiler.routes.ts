import { Router } from 'express';
import { compileHandler, downloadHandler } from '../controllers/compiler.controller.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

router.post('/compile', upload.single('file'), compileHandler);
router.get('/download/:filename', downloadHandler);

export default router;