# Desafío técnico QA — Guía rápida de ejecución

## Requisitos

- Node.js 20 o superior.
- npm.

Ejecuta todos los comandos desde la carpeta raíz del proyecto.

## 1. Instalación inicial

Solo es necesario ejecutar estos comandos la primera vez:

```powershell
npm install
npx playwright install chromium
```

## 2. Ver la automatización en el navegador

Este es el comando recomendado para la presentación:

```powershell
npm run test:demo
```

Chromium se abrirá automáticamente y ejecutará los tres casos uno por uno, con pausas visibles entre las acciones.
OJO - No es necesario iniciar la aplicación previamente.

## 3. Abrir el reporte de resultados

Después de ejecutar las pruebas:

```powershell
npm run report
```

## Otros comandos útiles

```powershell
npm test          # Ejecuta las pruebas rápidamente y sin mostrar el navegador
npm run test:ui   # Abre la interfaz interactiva de Playwright
npm start         # Abre solamente la aplicación para revisión manual
```

Al utilizar `npm start`, se levanta la página de manera local en la ruta: <http://127.0.0.1:4173>

> La aplicación usa datos ficticios harckodeados y reinicia su estado al recargar la página (solo por motivos de prueba).
