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
            // Asegúrate de que el directorio de salida existe
            await fs.ensureDir(outputDir);
            const zipStream = fs.createReadStream(zipPath);

            await new Promise<void>((resolve, reject) => {
                zipStream
                    .pipe(unzipper.Extract({ path: outputDir }))
                    .on('close', resolve)
                    .on('error', reject);
            });

            logger.info(`Unzipped gamemode to ${outputDir}`);
        } catch (error) {
            logger.error('Failed to unzip gamemode', { error });
            throw new Error('Failed to unzip gamemode');
        }
    }

    async compile(inputDir: string, outputDir: string): Promise<void> {
        try {
            const gamemodesDir = path.join(inputDir, 'gamemodes');
            if (!(await fs.pathExists(gamemodesDir))) {
                throw this.createError(`'gamemodes' directory not found in ${inputDir}`, 400);
            }
    
            // Verifica que haya al menos un archivo .pwn
            const files = await fs.readdir(gamemodesDir);
            const pwnFile = files.find(file => file.endsWith('.pwn'));
            if (!pwnFile) {
                throw this.createError('No .pwn file found in the gamemodes directory', 400);
            }
    
            const pwnPath = path.join(gamemodesDir, pwnFile); // Ruta correcta para el archivo .pwn
            const compilerPath = path.join(CONFIG.PATHS.COMPILER, 'pawncc'); // Ruta al compilador
    
            // Corrige la ruta de salida para que solo sea el directorio y el nombre del archivo .amx
            const outputFilePath = path.join(outputDir, `${pwnFile.replace('.pwn', '.amx')}`);
    
            logger.info('Paths being used:', { compilerPath, pwnPath, outputFilePath });
    
            // Asegúrate de que el directorio de salida exista antes de continuar
            await fs.ensureDir(path.dirname(outputFilePath));
    
            // Verifica si el compilador tiene permisos de ejecución
            if (process.platform !== 'win32') {
                await fs.chmod(compilerPath, '755');
            }
    
            // Ejecuta el comando de compilación
            const compileResult = await this.executeCompilerCommand(compilerPath, pwnPath, outputFilePath);
            if (compileResult.success) {
                logger.success('Compilation successful');
            } else {
                throw this.createError(`Compilation failed: ${compileResult.stderr || compileResult.stdout}`, 500);
            }
        } catch (error) {
            logger.error('Compilation error', { error });
            throw error; // Propaga el error para manejo adicional
        }
    }
    

    private async executeCompilerCommand(compilerPath: string, pwnPath: string, outputFilePath: string): Promise<{ success: boolean, stdout: string, stderr: string }> {
        return new Promise((resolve, reject) => {
            const command = `"${compilerPath}" "${pwnPath}" -o"${outputFilePath}"`;
            logger.info('Executing compiler', { command });

            exec(command, { cwd: path.dirname(pwnPath) }, (error, stdout, stderr) => {
                if (error || stderr) {
                    logger.error('Compilation failed', { stdout, stderr, error: error.message });
                    resolve({ success: false, stdout, stderr });
                } else {
                    resolve({ success: true, stdout, stderr });
                }
            });
        });
    }

    private async resolveIncludes(pwnPath: string, includeDir: string): Promise<void> {
        try {
            const fileContent = await fs.readFile(pwnPath, 'utf8');
            const includeRegex = /#include\s+["<](.+?)[">]/g;
            const matches = [...fileContent.matchAll(includeRegex)];

            for (const match of matches) {
                const includePath = match[1];
                const resolvedPath = path.resolve(path.dirname(pwnPath), includePath);

                if (await fs.pathExists(resolvedPath)) {
                    const destPath = path.join(includeDir, path.basename(includePath));
                    await fs.copy(resolvedPath, destPath);
                    logger.info(`Copied include file: ${resolvedPath} to ${destPath}`);
                } else {
                    logger.warn(`Include file not found: ${includePath}`);
                }
            }
        } catch (error) {
            logger.error('Failed to resolve includes', { error });
            throw new Error('Failed to resolve includes');
        }
    }

    private createError(message: string, statusCode: number): CompileError {
        const error = new Error(message) as CompileError;
        error.statusCode = statusCode;
        return error;
    }
}
