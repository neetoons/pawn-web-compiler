import express from 'express';
import cors from 'cors';
import { CONFIG } from './config/index.js';
import { logger } from './utils/logger.js';
import compilerRoutes from './routes/compiler.routes.js';
import fs from "fs-extra"
import path from "path"

async function bootstrap() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/', compilerRoutes);
  app.use(express.static(path.join(process.cwd(), 'src/public')));


  // Asegurar que existan los directorios necesarios
  // #include <> // "C:\path\to\pawncc" -I"C:\pawnwebcompiler\includes" "C:\path\to\mi_gamemode.pwn" -o"C:\path\to\mi_gamemode.amx"


  // ./pawncc -v2 -d3 -r -w1 "C:\Users\zTrax\Desktop\pawnwebcompiler\samp037_svr_R2-2-1_win32\gamemodes\bare.pwn" -i"C:\Users\zTrax\Desktop\pawnwebcompiler\samp037_svr_R2-2-1_win32\include" -o"C:\Users\zTrax\Desktop\pawnwebcompiler\samp037_svr_R2-2-1_win32\gamemodes\bare.amx"
  // pawno /include 
  // pawno /pawncc 
  // /gamemodes 
  
  //./pawncc -d2 -v2 -I"C:\Users\zTrax\Desktop\pawnwebcompiler\samp037_svr_R2-2-1_win32\pawno\include" "C:\Users\zTrax\Desktop\pawnwebcompiler\samp037_svr_R2-2-1_win32\gamemodes\bare.pwn" -o"C:\Users\zTrax\Desktop\pawnwebcompiler\samp037_svr_R2-2-1_win32\gamemodes\bare.amx"

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