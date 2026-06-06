const electron = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./src/main/ipc-handlers');

const { app, BrowserWindow } = electron;

let mainWindow = null;

function createWindow() {
  const settings = require('./src/main/settings');
  const bounds = settings.get('windowBounds');

  mainWindow = new BrowserWindow({
    width: bounds.width || 900,
    height: bounds.height || 620,
    minWidth: 700,
    minHeight: 450,
    x: bounds.x,
    y: bounds.y,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'icon', 'logo.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  mainWindow.on('close', (e) => {
    const closeBehavior = settings.get('closeBehavior');
    if (closeBehavior === 'tray') {
      e.preventDefault();
      mainWindow.hide();
    } else if (closeBehavior === 'quit') {
      mainWindow = null;
    } else {
      e.preventDefault();
      mainWindow.webContents.send('app:close-request');
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.on('resize', () => {
    if (mainWindow) {
      const [w, h] = mainWindow.getSize();
      const [x, y] = mainWindow.getPosition();
      settings.set('windowBounds', { x, y, width: w, height: h });
    }
  });
}

app.whenReady().then(() => {
  registerIpcHandlers(() => mainWindow);
  createWindow();
});

app.on('window-all-closed', () => {});
app.on('activate', () => {
  if (mainWindow === null) createWindow();
  else mainWindow.show();
});
