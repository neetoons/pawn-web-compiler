import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import * as unzipper from 'unzipper';
import { CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class CompileError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'CompileError';
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, CompileError.prototype);
    }
}

export class CompilerService {
    private static instance: CompilerService;

    private constructor() { }

    public static getInstance(): CompilerService {
        if (!CompilerService.instance) {
            CompilerService.instance = new CompilerService();
        }
        return CompilerService.instance;
    }

    // Descomprime el archivo ZIP y lista todos los directorios encontrados
    async unzipAndListFolders(zipPath: string, outputDir: string) {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const directoryNames: string[] = [];
        fs.createReadStream(zipPath)
            .pipe(unzipper.Parse())
            .on('entry', entry => {
                const fileName = entry.path;
                const type = entry.type; // 'File' o 'Directory'

                if (type === 'Directory') {
                    console.log(`Directorio encontrado: ${fileName}`);
                    directoryNames.push(fileName);
                }

                entry.autodrain();
            })
            .on('finish', () => {
                console.log('Descompresión completada. Directorios encontrados:');
                console.log(directoryNames);
            })
            .on('error', (err) => {
                console.error('Error al descomprimir:', err);
            });
    }

    // Descomprime el archivo ZIP y busca el directorio gamemodes
    async unzipGamemode(zipPath: string, outputDir: string): Promise<any> {
        try {
            console.log("Descomprimiendo...");
            console.log("ZIP Path:", zipPath);
            console.log("Output Directory:", outputDir);

            // Descomprimir y listar los directorios en el proceso
            await this.unzipAndListFolders(zipPath, outputDir);

            await fs.createReadStream(zipPath)
                .pipe(unzipper.Extract({ path: outputDir }))
                .on("close", () => {
                    console.log("Descompresión completada");
                });

            // Ahora verificamos la existencia de 'gamemodes'
            const gamemodesDir = await this.findGamemodesDirectory(outputDir);
            console.log('Gamemodes directory found at:', gamemodesDir);

            if (!gamemodesDir) {
                throw new Error(`'gamemodes' directory not found in ${outputDir}`);
            }

            // Proceder con la compilación del gamemode
            await this.compile(gamemodesDir);

            return outputDir;

        } catch (error) {
            console.log("Error al descomprimir:", error);
            throw error;
        }
    }

    private async findGamemodesDirectory(baseDir: string): Promise<string | null> {
        const files = await fs.readdir(baseDir);
        console.log(`Buscando en: ${baseDir}`); // Registro para ver en qué directorio estamos buscando
    
        for (let file of files) {
            const fullPath = path.join(baseDir, file);
            const stat = await fs.stat(fullPath);
    
            console.log(`Explorando: ${fullPath}`); // Ver qué directorios estamos explorando
    
            if (stat.isDirectory()) {
                // Verificar si encontramos el directorio 'gamemodes' en este nivel
                if (file.toLowerCase() === 'gamemodes') {
                    console.log(`Directorio 'gamemodes' encontrado en: ${fullPath}`); // Confirmar cuando lo encontramos
                    return fullPath; // Retornar la ruta completa del directorio 'gamemodes'
                }
    
                // Si no encontramos 'gamemodes', seguimos buscando recursivamente en los subdirectorios
                const subDir = await this.findGamemodesDirectory(fullPath);
                if (subDir) {
                    return subDir;
                }
            }
        }
    
        console.log('No se encontró el directorio "gamemodes" en esta ruta'); // Si no encontramos el directorio en esta ruta
        return null; // Si no encontramos 'gamemodes'
    }
    
    // Función principal para compilar el archivo pwn
    async compile(gamemodesDir: string): Promise<void> {
        try {
            const files = await fs.readdir(gamemodesDir);
            const pwnFile = files.find(file => file.endsWith('.pwn'));

            if (!pwnFile) {
                throw this.createError('No .pwn file found in the gamemodes directory', 400);
            }

            const pwnPath = path.join(gamemodesDir, pwnFile);
            const compilerPath = path.join(CONFIG.PATHS.COMPILER, 'pawncc');
            const outputFilePath = path.join(gamemodesDir, `${pwnFile.replace('.pwn', '.amx')}`);
            const pawnoIncludeDir = path.join(gamemodesDir, 'pawno', 'include');

            logger.info('Paths being used:', { compilerPath, pwnPath, outputFilePath, pawnoIncludeDir });

            // Asegurarse de que los directorios padres existan
            await fs.ensureDir(pawnoIncludeDir);

            if (process.platform !== 'win32') {
                await fs.chmod(compilerPath, '755');
            }

            const compileResult = await this.executeCompilerCommand(
                compilerPath,
                pwnPath,
                outputFilePath,
                pawnoIncludeDir
            );

            if (compileResult.success) {
                logger.info('Compilation successful');
            } else {
                throw this.createError(`Compilation failed: ${compileResult.stderr || compileResult.stdout}`, 500);
            }

            // Copiar los archivos compilados y todos los archivos a la carpeta final
            const finalOutputDir = path.join(gamemodesDir, 'compiled');
            await fs.copy(gamemodesDir, finalOutputDir, { overwrite: true });

            logger.info(`Copied compiled gamemode and all files to ${finalOutputDir}`);
        } catch (error) {
            logger.error('Compilation error', {
                error: error instanceof Error ? error.stack : 'Unknown error',
            });
            throw error instanceof CompileError ? error : this.createError(
                `Compilation process failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    private async executeCompilerCommand(
        compilerPath: string,
        pwnPath: string,
        outputFilePath: string,
        pawnoIncludeDir: string
    ): Promise<{ success: boolean; stdout: string; stderr: string }> {
        return new Promise((resolve) => {
            const command = `"${compilerPath}" "${pwnPath}" -o"${outputFilePath}" -i"${pawnoIncludeDir}" -r -w1 -d3 -v2`;
            logger.info('Executing compiler command', { command });

            exec(command, { cwd: path.dirname(pwnPath) }, (error, stdout, stderr) => {
                if (error || stderr) {
                    logger.error('Compilation failed', { stdout, stderr, error: error?.message });
                    resolve({ success: false, stdout, stderr });
                } else {
                    resolve({ success: true, stdout, stderr });
                }
            });
        });
    }

    private createError(message: string, statusCode: number): CompileError {
        return new CompileError(message, statusCode);
    }

    // Limpieza de archivos y directorios al finalizar
    async cleanup(outputDir: string): Promise<void> {
        try {
            // Limpiar los directorios vacíos, si es necesario
            await fs.emptyDir(outputDir); // Elimina todos los archivos dentro del directorio
            await fs.remove(outputDir); // Elimina el directorio en sí

            console.log('Directorio de salida limpiado correctamente:', outputDir);
        } catch (error) {
           
        }
    }
}

