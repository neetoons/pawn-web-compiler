import express from 'express';
import cors from 'cors';
import { CONFIG } from './config/index';
import { logger } from './utils/logger';
import compilerRoutes from './routes/compiler.routes';
import fs from "fs-extra"

async function bootstrap() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/', compilerRoutes);

  // Asegurar que existan los directorios necesarios
  await Promise.all([
    fs.ensureDir(CONFIG.PATHS.UPLOADS),
    fs.ensureDir(CONFIG.PATHS.OUTPUT)
  ]);

  app.listen(CONFIG.PORT, () => {
    logger.info(`Server running on port ${CONFIG.PORT}`);
  });
}

bootstrap().catch(error => {
  logger.error('Failed to start server', { error });
  console.log(error)
  process.exit(1);
});