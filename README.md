# Restaurant POS - Desktop Application

A fully offline Restaurant Point of Sale (Billing) Desktop Application built with Electron, React, and SQLite.

## Project Structure

```
restaurant-pos/
├── electron/           # Electron main process files
│   ├── main.js        # Main Electron process (window creation, app lifecycle)
│   └── preload.js     # Preload script (secure bridge between Electron and React)
├── src/               # React application source code
│   ├── App.jsx        # Main React component
│   ├── App.css        # App styles
│   ├── main.jsx       # React entry point
│   └── index.css      # Global styles
├── public/            # Static assets (images, icons, etc.)
├── dist/              # Built files (created after `npm run build`)
├── index.html         # HTML template
├── vite.config.js     # Vite configuration
└── package.json       # Project dependencies and scripts
```

## Understanding the Structure

### Electron Folder
- **main.js**: This is the "backend" of your Electron app. It:
  - Creates the application window
  - Manages app lifecycle (start, close, etc.)
  - Handles system-level operations
  - Runs in Node.js environment

### src Folder
- **React components**: Your UI code lives here
- **main.jsx**: Entry point that renders your React app
- **App.jsx**: Your main React component

### How It Works
1. **Main Process** (electron/main.js): Creates the window
2. **Renderer Process** (React app): Displays the UI
3. **Preload Script** (electron/preload.js): Safely bridges them together

## Development

### Run the app in development mode:
```bash
npm run dev
```

This will:
1. Start Vite dev server (for React hot-reload)
2. Start Electron and load the React app

### Build for production:
```bash
npm run build
```

### Package as Windows installer:
```bash
npm run build:electron
```

## Current Status

✅ **PHASE 1 Complete**: Environment setup and "Hello POS" app is ready!
