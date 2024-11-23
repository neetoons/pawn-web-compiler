// @ts-nocheck
import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import * as unzipper from 'unzipper';
import { CONFIG } from '../config/index';
import { logger } from '../utils/logger';
import { CompileError } from '../types';

export class CompilerService {
    private static instance: CompilerService;

    private constructor() { }

    public static getInstance(): CompilerService {
        if (!CompilerService.instance) {
            CompilerService.instance = new CompilerService();
        }
        return CompilerService.instance;
    }

    async unzipGamemode(zipPath: string, outputDir: string): Promise<void> {
        try {
            // Asegurarse de que el directorio de salida exista
            await fs.ensureDir(outputDir);

            // Usamos unzipper para extraer el archivo .zip
            const zipStream = fs.createReadStream(zipPath);

            // Extraemos el archivo .zip
            await new Promise<void>((resolve, reject) => {
                zipStream
                    .pipe(unzipper.Extract({ path: outputDir }))
                    .on('close', resolve)
                    .on('error', reject);
            });

            logger.info(`Unzipped gamemode to ${outputDir}`);
        } catch (error) {
            // Loguear el error y lanzar una excepción personalizada
            logger.error('Failed to unzip gamemode', { error });
            throw new Error('Failed to unzip gamemode');
        }
    }

    async compile(inputDir: string, outputFile: string): Promise<any> {
        try {
            // Buscar el archivo .pwn
            const files = await fs.readdir(inputDir);
            const pwnFile = files.find(file => file.endsWith('.pwn'));

            if (!pwnFile) {
                throw this.createError('No .pwn file found', 400);
            }

            const pwnPath = path.join(inputDir, pwnFile);
            const compilerPath = path.join(CONFIG.PATHS.COMPILER, 'pawno', 'pawncc');

            // En Windows no necesitamos ./
            const pawnccCommand = process.platform === 'win32' ?
                compilerPath :
                `./${path.relative(inputDir, compilerPath)}`;

            await fs.ensureDir(path.dirname(outputFile));

            // Dar permisos al compilador en Unix
            if (process.platform !== 'win32') {
                await fs.chmod(compilerPath, '755');
            }

            return new Promise((resolve, reject) => {
                // Cambiar al directorio de la gamemode
                process.chdir(inputDir);

                const command = `"${pawnccCommand}" "${pwnPath}" -o"${outputFile}"`;

                logger.info('Executing compiler', { command });

                exec(command, {
                    cwd: inputDir,
                    env: {
                        ...process.env,
                        PATH: `${process.env.PATH}:${path.join(CONFIG.PATHS.COMPILER, 'pawno')}`
                    }
                }, (error, stdout, stderr) => {
                    if (error || stderr) {
                        logger.error('Compilation failed', { stdout, stderr });
                        reject(new Error(stderr || stdout));
                        return;
                    }
                    logger.success('Compilation successful');
                    resolve();
                });
            });
        } catch (error) {
            logger.error('Compilation error', { error });
            throw error;
        }
    }

    private createError(message: string, statusCode: number): CompileError {
        const error = new Error(message) as CompileError;
        error.statusCode = statusCode;
        return error;
    }
}