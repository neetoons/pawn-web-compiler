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

    async extractZip(zipPath:string, outputDir:string): Promise<void> {
        const directory = await unzipper.Open.file(zipPath);
        return await directory.extract({ path: outputDir })
    }
    private async findGamemodeFileName(baseDir: string): Promise<string | null> {
        const file = await fs.readFile(baseDir, "utf-8");
        const lines = file.split(/\n/)
        const regex = /^gamemode0?\s+([\w\d_]+)/im
        console.log(`Buscando nombre de la gamemode en: ${baseDir}`); // Registro para ver en qué directorio estamos buscando
        for(const line of lines) {
            const match = line.match(regex)
            if(match != null && match[1]) {
                console.log(`Nombre de la gamemode encontrada: ${match[1]}`)
                return match[1];
            }
        }

        console.log('No se encontró el archivo "server.cfg" en esta ruta'); // Si no encontramos el directorio en esta ruta
        return null; // Si no encontramos 'gamemodes'
    }

    private async findServerCFG(baseDir: string): Promise<string | null> {
        console.log(`Buscando server.cfg en: ${baseDir}`); // Registro para ver en qué directorio estamos buscando
        const files = await fs.readdir(baseDir)
        for (const file of files) {
            const fullPath = path.join(baseDir, file);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory())  continue;
            //// Verificar si encontramos el archivo 'server.cfg' en este nivel
            if (file.toLowerCase() === 'server.cfg') {
                console.log(`Archivo 'server.cfg' encontrado`); // Confirmar cuando lo encontramos
                return fullPath; // Retornar la ruta completa del directorio 'server.cfg'
            }
        }
        console.log('No se encontró el archivo "server.cfg" en esta ruta'); // Si no encontramos el directorio en esta ruta
        return null; // Si no encontramos 'gamemodes'
    }

    // Descomprime el archivo ZIP y busca el directorio gamemodes
    async unzipGamemode(zipPath: string, outputDir: string, outputFilePath:string, outputFileName:string): Promise<any> {
        try {
            console.log("Descomprimiendo...");
            console.log("ZIP Path:", zipPath);
            console.log("Output Directory:", outputDir);

            // Descomprimir y listar los directorios en el proceso
            //await this.unzipAndListFolders(zipPath, outputDir);
            await this.extractZip(zipPath, outputDir);

            const gamemodesDir = await this.findGamemodesDirectory(outputDir);
            //// Ahora verificamos la existencia de 'gamemodes'
            if (!gamemodesDir) {
                throw new Error(`'gamemodes' directory not found in ${outputDir}`);
            }

            // Buscamos el server.cfg para saber el nombre de la gamemode
            const serverConfigPath = await this.findServerCFG(outputDir);
            if(!serverConfigPath) {
                throw new Error("archivo server.cfg no encontrado")
            }

            // Buscamos el nombre de la gamemode
            const gamemodeFileName = await this.findGamemodeFileName(serverConfigPath);
            if(!gamemodeFileName)  {
                throw new Error("nombre de la gamemode no encontrada")
            }
            // Proceder con la compilación del gamemode
            await this.compile(gamemodesDir, gamemodeFileName, outputFilePath, outputFileName);
            return outputDir;

        } catch (error) {
            console.log("Error al descomprimir:", error);
            throw error;
        }
    }
    private async findGamemodesDirectory(baseDir: string): Promise<string | null> {
        const files = await fs.readdir(baseDir);
        console.log(`Buscando directorio gamemodes en: ${baseDir}`); // Registro para ver en qué directorio estamos buscando
    
        for (let file of files) {
            const fullPath = path.join(baseDir, file);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
                // Verificar si encontramos el directorio 'gamemodes' en este nivel
                if (file.toLowerCase() === 'gamemodes') {
                    console.log(`Directorio 'gamemodes' encontrado`); // Confirmar cuando lo encontramos
                    return fullPath; // Retornar la ruta completa del directorio 'gamemodes'
                }
            }
        }
    
        console.log('No se encontró el directorio "gamemodes" en esta ruta'); // Si no encontramos el directorio en esta ruta
        return null; // Si no encontramos 'gamemodes'
    }

    // Función principal para compilar el archivo pwn
    async compile(gamemodesDir: string, gamemodeFileName:string, outputFilePath:string, zipDirName:string ): Promise<void> {
        try {
            const outputFileName = zipDirName + ".amx"
            const pawnoIncludeDir = path.join('pawno', 'include');

            // Asegurarse de que los directorios padres existan
            await fs.ensureDir(pawnoIncludeDir);


            let compilerPath;
            if (process.platform !== 'win32') {
                compilerPath = path.join(process.cwd(), CONFIG.PATHS.COMPILER, 'pawncc');
                await fs.chmod(compilerPath, '755');
            } else {
                compilerPath = path.join(process.cwd(), CONFIG.PATHS.COMPILER, 'pawncc.exe');
            }
            if(!compilerPath) {
                throw new Error("Sistema operativo no encontrado")
            }

            logger.info('Paths being used:', { compilerPath, zipDirName, gamemodesDir, outputFileName, pawnoIncludeDir });
            const gamemodesDirPath = path.join(process.cwd(), gamemodesDir)
            const compileResult = await this.executeCompilerCommand(
                compilerPath,
                gamemodesDirPath,
                outputFileName,
                gamemodeFileName
            );

            if (compileResult.success) {
                logger.info('Compilation successful');
            } else {
                throw this.createError(`Compilation failed: ${compileResult.stderr || compileResult.stdout}`, 500);
            }

            // Copiar los archivos compilados y todos los archivos a la directorio final
            await fs.copy(path.join(gamemodesDir, outputFileName), outputFilePath, { overwrite: true });
            logger.info(`Copied compiled gamemode and all files to ${outputFilePath}`);
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
        gamemodesDirPath: string,
        outputFileName: string,
        gamemodeFileName:string
    ): Promise<{ success: boolean; stdout: string; stderr: string }> {
        return new Promise((resolve) => {
            const command = `"${compilerPath}" "./${gamemodeFileName}.pwn" -o"${outputFileName}" -i"../pawno/include" -r -w1 -d3 -v2`;
            logger.info('Executing compiler command', { command });

            exec(command, { cwd: path.dirname(gamemodesDirPath) + "/gamemodes"}, (error, stdout, stderr) => {
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

