const { ipcMain, dialog, clipboard, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const vault = require('./vault');
const settings = require('./settings');
const AutoLockTimer = require('./autoLock');

let autoLock = null;
let getWin = null;

function registerIpcHandlers(getMainWindow) {
  getWin = getMainWindow;
  autoLock = new AutoLockTimer(getMainWindow);
  setupLockHandler();
  setupVaultHandlers();
  setupSettingsHandlers();
  setupDialogHandlers();
  setupClipboardHandler();
  setupAppHandlers();
}

function setupLockHandler() {
  ipcMain.handle('vault:unlock', async (_, password) => {
    let filePath = settings.get('storagePath');
    if (!filePath) {
      filePath = path.join(require('electron').app.getPath('userData'), 'PassVault', 'vault.pvault');
    }
    if (!fs.existsSync(filePath)) return { success: false, error: 'NO_VAULT' };

    let attempts = settings.get('_loginAttempts') || 0;
    const limit = settings.get('loginAttemptLimit') || 5;
    const cooldownUntil = settings.get('_cooldownUntil') || 0;

    if (cooldownUntil > Date.now()) {
      return { success: false, error: 'COOLDOWN', remaining: Math.ceil((cooldownUntil - Date.now()) / 1000) };
    }

    const result = vault.unlock(filePath, password);
    if (result) {
      settings.set('_loginAttempts', 0);
      settings.set('_cooldownUntil', 0);
      const lockMinutes = settings.get('autoLockMinutes') || 30;
      autoLock.start(lockMinutes, () => {
        vault.lock();
        getWin().webContents.send('app:lock-required');
      });
      return { success: true, state: vault.state };
    } else {
      attempts++;
      settings.set('_loginAttempts', attempts);
      if (attempts >= limit) {
        settings.set('_cooldownUntil', Date.now() + 30000);
        return { success: false, error: 'COOLDOWN', remaining: 30 };
      }
      return { success: false, error: 'WRONG_PASSWORD', remaining: limit - attempts };
    }
  });

  ipcMain.handle('vault:unlock-with-key', async (_, key) => {
    let filePath = settings.get('storagePath');
    if (!filePath) {
      filePath = path.join(require('electron').app.getPath('userData'), 'PassVault', 'vault.pvault');
    }
    if (!fs.existsSync(filePath)) return { success: false, error: 'NO_VAULT' };
    const result = vault.unlockWithKey(filePath, key);
    if (result) {
      const lockMinutes = settings.get('autoLockMinutes') || 30;
      autoLock.start(lockMinutes, () => {
        vault.lock();
        getWin().webContents.send('app:lock-required');
      });
      return { success: true, state: vault.state };
    }
    return { success: false, error: 'WRONG_KEY' };
  });

  ipcMain.handle('vault:lock', async () => {
    autoLock.stop();
    vault.lock();
    return { success: true };
  });

  ipcMain.handle('vault:reset-data', async () => {
    settings.reset();
    vault.resetData();
    autoLock.stop();
    return { success: true };
  });
}

function setupVaultHandlers() {
  ipcMain.handle('vault:setup', async (_, password, keyChoice, customKey, storagePath) => {
    try {
      const result = vault.create(password, keyChoice, customKey, storagePath);
      settings.set('storagePath', vault.vaultPath);
      return { success: true, recoveryKey: result.recoveryKey, state: vault.state };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('vault:save', async () => { vault.save(); return { success: true }; });
  ipcMain.handle('vault:get-state', async () => vault.state);

  ipcMain.handle('vault:add-entry', async (_, entry) => {
    try {
      const result = vault.addEntry(entry);
      return { success: true, entry: result };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('vault:update-entry', async (_, entry) => {
    try {
      const result = vault.updateEntry(entry);
      return { success: true, entry: result };
    } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('vault:delete-entry', async (_, id) => {
    const result = vault.deleteEntry(id);
    return { success: result };
  });

  ipcMain.handle('vault:reorder', async (_, orderMap) => {
    vault.reorderEntries(orderMap);
    return { success: true };
  });

  ipcMain.handle('vault:restore-entry', async (_, id) => {
    const result = vault.restoreEntry(id);
    return { success: result };
  });

  ipcMain.handle('vault:clear-trash', async () => { vault.clearTrash(); return { success: true }; });

  ipcMain.handle('vault:add-vault', async (_, name) => {
    const result = vault.addVault(name);
    return { success: true, vault: result };
  });

  ipcMain.handle('vault:delete-vault', async (_, id, action) => {
    const result = vault.deleteVault(id, action);
    return { success: result };
  });

  ipcMain.handle('vault:rename-vault', async (_, id, name) => {
    const result = vault.renameVault(id, name);
    return { success: result };
  });

  ipcMain.handle('vault:reorder-vaults', async (_, order) => {
    vault.reorderVaults(order);
    return { success: true };
  });

  ipcMain.handle('vault:export-plain', async (_, filePath) => {
    const data = vault.exportPlain();
    fs.writeFileSync(filePath, JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), entries: data }, null, 2));
    return { success: true };
  });

  ipcMain.handle('vault:export-encrypted', async (_, filePath) => {
    fs.copyFileSync(vault.vaultPath, filePath);
    return { success: true };
  });

  ipcMain.handle('vault:import', async (_, filePath, type, password) => {
    try {
      if (type === 'plain') {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return { success: true, entries: data.entries, conflicts: [] };
      } else if (type === 'encrypted') {
        const tempVault = Object.create(vault);
        const result = tempVault.unlock(filePath, password);
        if (!result) return { success: false, error: 'WRONG_PASSWORD' };
        return { success: true, entries: tempVault.data.entries };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('vault:change-master', async (_, oldPw, newPw) => {
    const result = vault.changeMasterPassword(oldPw, newPw);
    return { success: result };
  });

  ipcMain.handle('vault:regenerate-key', async (_, password) => {
    try {
      const newKey = vault.regenerateRecoveryKey(password);
      return { success: true, recoveryKey: newKey };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('key:generate-random', async () => {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  });

  ipcMain.handle('check-storage-path', async (_, filePath) => {
    let exists = false;
    try {
      exists = fs.existsSync(filePath);
    } catch (e) {}
    return { success: !exists, exists };
  });
}

function setupSettingsHandlers() {
  ipcMain.handle('settings:get', async () => settings.getAll());
  ipcMain.handle('settings:set', async (_, key, value) => {
    settings.set(key, value);
    if (key === 'autoLockMinutes') autoLock.update(value);
    return { success: true };
  });
}

function setupDialogHandlers() {
  ipcMain.handle('dialog:pick-folder', async () => {
    const result = await dialog.showOpenDialog(getWin(), { properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:pick-file', async (_, filters) => {
    const result = await dialog.showOpenDialog(getWin(), { filters, properties: ['openFile'] });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:save-file', async (_, filters) => {
    const result = await dialog.showSaveDialog(getWin(), { filters });
    return result.canceled ? null : result.filePath;
  });
}

function setupClipboardHandler() {
  const timers = {};
  ipcMain.handle('clipboard:copy', async (_, text, duration) => {
    clipboard.writeText(text);
    if (duration > 0) {
      if (timers.current) clearTimeout(timers.current);
      timers.current = setTimeout(() => {
        if (clipboard.readText() === text) clipboard.writeText('');
      }, duration * 60 * 1000);
    }
    return { success: true };
  });
}

function setupAppHandlers() {
  ipcMain.handle('app:get-path', async () => {
    return path.join(__dirname, '..', '..');
  });
}

module.exports = { registerIpcHandlers };
