const electron = require('electron');
const path = require('path');

const { app, BrowserWindow, Menu, Tray, nativeImage } = electron;

let mainWindow = null;
let tray = null;

function createWindow() {
  const settings = require('./src/main/settings');
  const bounds = settings.get('windowBounds');

  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: bounds.width || 900,
    height: bounds.height || 620,
    minWidth: 700,
    minHeight: 450,
    x: bounds.x,
    y: bounds.y,
    title: '密码保管箱',
    backgroundColor: '#f5f0e8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'icon', 'logo.png')
  });

  // restore zoom factor
  try {
    const zf = settings.get('zoomFactor') || 1;
    mainWindow.webContents.setZoomFactor(zf);
  } catch (e) {}

  // ── System Tray ──
  const trayIconPath = path.join(__dirname, 'icon', 'logo.png');
  try {
    const trayIcon = nativeImage.createFromPath(trayIconPath);
    tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
    tray.setToolTip('密码保管箱');
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          mainWindow.removeAllListeners('close');
          mainWindow.close();
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      mainWindow.show();
      mainWindow.focus();
    });
  } catch (e) {
    console.error('Failed to create tray:', e.message);
  }

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
  const { registerIpcHandlers } = require('./src/main/ipc-handlers');
  registerIpcHandlers(() => mainWindow);
  createWindow();
});

app.on('window-all-closed', () => {});
app.on('activate', () => {
  if (mainWindow === null) createWindow();
  else mainWindow.show();
});
app.on('before-quit', () => {
  if (tray) { tray.destroy(); tray = null; }
});
