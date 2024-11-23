# 🎮 Pawn Web Compiler

**Pawn Web Compiler** es una solución **open-source** diseñada para facilitar la compilación de gamemodes de SA:MP a través de una interfaz web intuitiva y eficiente. Los usuarios pueden subir sus proyectos en formato `.zip` y obtener archivos `.amx` compilados de manera rápida y segura.

> 🚀 **¿Por qué usar Pawn Web Compiler?**  
> - **Fácil de usar:** Subir, compilar y descargar en solo unos pasos.  
> - **Portabilidad:** Ejecútalo en cualquier servidor con Node.js.  
> - **Colaborativo:** Siéntete libre de contribuir al proyecto.

---

## 🌟 Características

- **Subida de archivos .zip** con toda la estructura del gamemode.
- **Compilación automática** utilizando el compilador `pawncc`.
- **Validación de archivos:** Asegura que se suba un gamemode válido.
- **Interfaz moderna:** Diseño simple, pero bonito, con animaciones y responsividad.
- **Descarga directa:** Obtén tu archivo `.amx` compilado sin complicaciones.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener lo siguiente instalado:

- **Node.js**: Versión 14 o superior.
- **npm** o **yarn**: Para gestionar las dependencias.
- **fs-extra**: Para manejar rutas y directorios.
- **Multer**: Para gestionar la subida de archivos.

Instala las dependencias ejecutando:

```bash
npm install
