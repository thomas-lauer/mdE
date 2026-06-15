const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const markdownFilters = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'Alle Dateien', extensions: ['*'] },
];

let mainWindow;
let pendingOpenedFile = null;
const gotSingleInstanceLock = app.requestSingleInstanceLock();

function findMarkdownArgument(argv) {
  const candidate = argv.find((argument) => {
    return typeof argument === 'string' && !argument.startsWith('-') && /\.(md|markdown)$/i.test(argument);
  });

  return candidate ? path.resolve(candidate) : null;
}

async function readMarkdownFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');

  return {
    filePath,
    fileName: path.basename(filePath),
    content,
  };
}

function sendOpenedFile(fileData) {
  pendingOpenedFile = fileData;

  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('file:opened-from-argument', fileData);
}

async function openMarkdownArgument(filePath) {
  try {
    const fileData = await readMarkdownFile(filePath);
    sendOpenedFile(fileData);
  } catch (error) {
    dialog.showErrorBox(
      'Markdown-Datei konnte nicht geoeffnet werden',
      `${filePath}\n\n${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 920,
    minHeight: 640,
    title: 'mdE - Markdown Editor',
    backgroundColor: '#eef1f4',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://github.com/thomas-lauer/mdE')) {
      shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  mainWindow.webContents.once('did-finish-load', () => {
    const startupFile = findMarkdownArgument(process.argv);
    if (startupFile) {
      void openMarkdownArgument(startupFile);
    }
  });
}

function sendMenuCommand(command) {
  BrowserWindow.getFocusedWindow()?.webContents.send('menu:command', command);
}

function createMenu() {
  const template = [
    {
      label: 'Datei',
      submenu: [
        { label: 'Oeffnen...', accelerator: 'CmdOrCtrl+O', click: () => sendMenuCommand('open') },
        { label: 'Speichern', accelerator: 'CmdOrCtrl+S', click: () => sendMenuCommand('save') },
        { label: 'Speichern unter...', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendMenuCommand('saveAs') },
        { type: 'separator' },
        { role: 'quit', label: 'Beenden' },
      ],
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo', label: 'Rueckgaengig' },
        { role: 'redo', label: 'Wiederholen' },
        { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' },
        { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einfuegen' },
        { role: 'selectAll', label: 'Alles auswaehlen' },
      ],
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload', label: 'Neu laden' },
        { role: 'toggleDevTools', label: 'Entwicklertools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Originalgroesse' },
        { role: 'zoomIn', label: 'Vergroessern' },
        { role: 'zoomOut', label: 'Verkleinern' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Vollbild' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function normalizeMarkdownFileName(fileName) {
  const trimmed = fileName?.trim() || 'notizen.md';
  return /\.(md|markdown)$/i.test(trimmed) ? trimmed : `${trimmed}.md`;
}

async function writeMarkdownFile({ filePath, fileName, content }, forceDialog = false) {
  let targetPath = filePath;

  if (forceDialog || !targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Markdown-Datei speichern',
      defaultPath: normalizeMarkdownFileName(fileName),
      filters: markdownFilters,
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    targetPath = result.filePath;
  }

  await fs.writeFile(targetPath, content, 'utf8');

  return {
    filePath: targetPath,
    fileName: path.basename(targetPath),
  };
}

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Markdown-Datei oeffnen',
    properties: ['openFile'],
    filters: markdownFilters,
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return readMarkdownFile(result.filePaths[0]);
});

ipcMain.handle('file:save', async (_event, payload) => {
  return writeMarkdownFile(payload, false);
});

ipcMain.handle('file:save-as', async (_event, payload) => {
  return writeMarkdownFile(payload, true);
});

ipcMain.handle('file:get-pending-opened-file', () => {
  const fileData = pendingOpenedFile;
  pendingOpenedFile = null;
  return fileData;
});

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    createMenu();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('second-instance', (_event, argv) => {
    const filePath = findMarkdownArgument(argv);

    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    }

    if (filePath) {
      void openMarkdownArgument(filePath);
    }
  });
}
