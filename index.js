
import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import { exec } from "child_process";
import fs from "fs-extra";
import cors from "cors";
import * as unzipper from "unzipper";

// Configuración del servidor
const app = express();
const compilerPath = path.join(__dirname, "compiler"); // Ruta al compilador de la gamemode
const outputDir = path.join(__dirname, "output"); // Carpeta de salida
const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // Limite de 1 GB

// Configuración de Multer
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const originalName = path.parse(file.originalname).name;
    cb(null, `${originalName}.zip`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (fileExtension === ".zip") {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos .zip"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Middleware de CORS
app.use(cors());

// Función para descomprimir el archivo .zip
const unzipFile = async (zipPath: string, outputDir: string): Promise<void> => {
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: outputDir }))
    .on("close", () => console.log("Descompresión completada"));
};

const compileGamemode = async (gamemodeDir: string, outputFile: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Ejecutar el compilador directamente en la carpeta de la gamemode
    console.log(gamemodeDir, outputFile)
    exec(`${gamemodeDir}/pawno/pawncc ${gamemodeDir} -o${outputFile}`, (error, stdout, stderr) => {
      if (error) {
        reject(`Error al compilar: ${stderr}`);
      } else {
        resolve();
      }
    });
  });
};

// Ruta para subir y compilar el archivo
app.post("/compile", upload.single("file"), async (req: Request, res: Response): Promise<any> => {
  if (!req.file) {
    return res.status(400).send("No se ha cargado ningún archivo.");
  }

  const originalName = path.parse(req.file.originalname).name;
  const zipPath = req.file.path;
  const outputGamemodeDir = path.join(__dirname, "uploads", originalName);
  const compiledFilePath = path.join(outputDir, `${originalName}.amx`);

  try {
    // Descomprimir el archivo .zip
    await unzipFile(zipPath, outputGamemodeDir);

    // Compilar la gamemode (sin verificar .pwn)
    await compileGamemode(outputGamemodeDir, compiledFilePath);

    // Copiar el archivo compilado a la carpeta de salida
    await fs.copy(compiledFilePath, path.join(outputDir, `${originalName}.amx`));

    // Eliminar los archivos temporales
    await fs.remove(zipPath);
    await fs.remove(outputGamemodeDir);

    // Responder con el enlace de descarga
    res.status(200).send({
      message: "Archivo compilado exitosamente.",
      downloadLink: `/download/${originalName}.amx`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(`Error: ${err}`);
  }
});

// Ruta para descargar el archivo compilado
app.get("/download/:filename", async (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(outputDir, filename);

  try {
    if (await fs.pathExists(filePath)) {
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Error al descargar el archivo:", err);
        }
      });
    } else {
      res.status(404).send("Archivo no encontrado.");
    }
  } catch (err) {
    res.status(500).send("Error al intentar acceder al archivo.");
  }
});

// Iniciar el servidor
app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});