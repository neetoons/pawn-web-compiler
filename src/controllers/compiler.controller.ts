import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { CompilerService } from '../services/compiler.service';
import { CONFIG } from '../config/index';
import { logger } from '../utils/logger';
import { CompileError } from '../types';

export async function compileHandler(req: Request, res: Response): Promise<any> {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const service = CompilerService.getInstance();
  const zipPath = req.file.path;
  const fileId = path.parse(req.file.filename).name;
  const outputDir = path.join(CONFIG.PATHS.UPLOADS, fileId);
  const outputFile = path.join(CONFIG.PATHS.OUTPUT, `${fileId}.amx`);

  try {
    // Descomprimir
    await service.unzipGamemode(zipPath, outputDir);

    // Compilar
    await service.compile(outputDir, outputFile);

    res.json({
      message: 'Compilation successful',
      downloadLink: `/download/${fileId}.amx`
    });

  } catch (error) {
    logger.error('Handler error', { error });
    const statusCode = (error as CompileError).statusCode || 500;
    res.status(statusCode).json({ 
      error: (error as Error).message 
    });

  } finally {
    // Limpiar archivos temporales
    try {
      await Promise.all([
        fs.remove(zipPath),
        fs.remove(outputDir)
      ]);
    } catch (error) {
      logger.error('Cleanup error', { error });
    }
  }
}

export async function downloadHandler(req: Request, res: Response): Promise<any> {
  const filename = req.params.filename;
  const filePath = path.join(CONFIG.PATHS.OUTPUT, filename);

  try {
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath);
  } catch (error) {
    logger.error('Download error', { error });
    res.status(500).json({ error: 'Download failed' });
  }
}