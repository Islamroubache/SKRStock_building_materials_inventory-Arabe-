const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const os = require('os');

// Set production environment if not in dev
if (!isDev) {
  process.env.NODE_ENV = 'production';
}

// Handle Prisma Database Path for Production
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'makhzoun.db');
const defaultDbPath = path.join(__dirname, 'prisma', 'dev.db');

if (!isDev) {
  try {
    if (!fs.existsSync(dbPath)) {
      console.log('Copying database to userData...');
      if (fs.existsSync(defaultDbPath)) {
        fs.copyFileSync(defaultDbPath, dbPath);
      }
    }
    process.env.DATABASE_URL = `file:${dbPath}`;
  } catch (err) {
    console.error('Failed to setup database:', err);
  }
}

const dev = isDev;
const nextApp = next({ dev, dir: __dirname });
const handle = nextApp.getRequestHandler();

let mainWindow;
let splashWindow;

// ─── SPLASH SCREEN ────────────────────────────────────────────────────────────
function createSplash() {
  const { screen } = require('electron');
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  // 40% of screen width, 38% of screen height
  const winW = Math.round(sw * 0.42);
  const winH = Math.round(sh * 0.40);

  splashWindow = new BrowserWindow({
    width: winW,
    height: winH,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'splash-preload.js'),
    },
    icon: path.join(__dirname, 'public', 'logo.png'),
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function closeSplashAndShowMain() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.destroy();
    splashWindow = null;
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

// IPC: splash signals it's done loading
ipcMain.on('splash-done', () => {
  closeSplashAndShowMain();
});

// ─── MAIN WINDOW ──────────────────────────────────────────────────────────────
function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    show: false,  // Hidden until splash is done
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'public', 'logo.png'),
    title: 'Soker.Stock — إدارة المخزون',
    autoHideMenuBar: true,
  });

  const url = isDev ? 'http://localhost:3000/orders' : `http://localhost:${port}/orders`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Hard fallback: if splash was never dismissed after 12s, force-show the main window
  setTimeout(() => {
    closeSplashAndShowMain();
  }, 12000);
}

// ─── PRINT: Hidden window approach ────────────────────────────────────────────
ipcMain.on('print-window', async () => {
  if (!mainWindow) return;

  const currentUrl = mainWindow.webContents.getURL();
  let printWin = null;

  try {
    printWin = new BrowserWindow({
      width: 1280,
      height: 900,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWin.loadURL(currentUrl);
    await new Promise(resolve => setTimeout(resolve, 3500));

    await printWin.webContents.insertCSS(`
      nav, aside, .no-print, [class*="sidebar"], [class*="Sidebar"] {
        display: none !important;
      }
      body > div > div, main {
        padding-left: 0 !important;
        margin-left: 0 !important;
      }
    `);

    await new Promise(resolve => setTimeout(resolve, 200));

    const pdfData = await printWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      displayHeaderFooter: false,
      margins: { marginType: 'default' },
    });

    const tmpPath = path.join(os.tmpdir(), `makhzoun-print-${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, pdfData);

    const openError = await shell.openPath(tmpPath);
    if (openError) console.error('Could not open PDF viewer:', openError);

  } catch (err) {
    console.error('Print failed:', err.message);
  } finally {
    if (printWin && !printWin.isDestroyed()) {
      printWin.destroy();
    }
  }
});

// ─── PRINT TO PDF: Save dialog ────────────────────────────────────────────────
ipcMain.handle('print-to-pdf', async (event, filename) => {
  if (!mainWindow) return { success: false, error: 'No main window' };
  try {
    const { filePath } = await dialog.showSaveDialog({
      title: 'حفظ كـ PDF',
      defaultPath: filename || 'document.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!filePath) return { success: false };

    const data = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      margins: { marginType: 'default' },
    });

    fs.writeFileSync(filePath, data);
    await shell.openPath(filePath);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('PDF export failed:', error);
    return { success: false, error: error.message };
  }
});

// ─── APP LIFECYCLE ────────────────────────────────────────────────────────────
app.on('ready', async () => {
  // Show splash immediately
  createSplash();

  if (isDev) {
    // In dev, Next.js is already running — just create the main window
    createWindow();
  } else {
    try {
      await nextApp.prepare();
      const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      });

      server.listen(0, (err) => {
        if (err) throw err;
        const port = server.address().port;
        console.log(`> Electron Server ready on http://localhost:${port}`);
        createWindow(port);
      });
    } catch (err) {
      console.error('Failed to start Next.js server:', err);
      app.quit();
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
