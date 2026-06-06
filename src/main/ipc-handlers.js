const { ipcMain, dialog, clipboard, BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');
const vault = require('./vault');
const settings = require('./settings');
const logger = require('./logger');
const sync = require('./sync');
const AutoLockTimer = require('./autoLock');

let autoLock = null;
let getWin = null;

function registerIpcHandlers(getMainWindow) {
  getWin = getMainWindow;
  autoLock = new AutoLockTimer(getMainWindow);

  logger.setEnabled(settings.get('logEnabled') || false);
  logger.info('APP', 'IPC handlers registered');

  setupLockHandler();
  setupVaultHandlers();
  setupSettingsHandlers();
  setupDialogHandlers();
  setupClipboardHandler();
  setupAppHandlers();
  setupSyncHandlers();
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
    // delete vault files from disk
    const storagePath = settings.get('storagePath');
    if (storagePath) {
      try { if (fs.existsSync(storagePath)) fs.unlinkSync(storagePath); } catch (e) {}
      try { if (fs.existsSync(storagePath + '.bak')) fs.unlinkSync(storagePath + '.bak'); } catch (e) {}
      try { if (fs.existsSync(storagePath + '.tmp')) fs.unlinkSync(storagePath + '.tmp'); } catch (e) {}
    }
    settings.reset();
    vault.resetData();
    autoLock.stop();
    return { success: true };
  });
}

function setupVaultHandlers() {
  ipcMain.handle('vault:setup', async (_, password, keyChoice, storagePath, customKey) => {
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
      return { success: true, entries: result };
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
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const entries = raw.entries || [];
        const conflicts = [];
        const current = vault.state.entries || [];
        entries.forEach((e, i) => {
          const dup = current.find(c => c.website === e.website && c.alias === e.alias && c.account === e.account);
          if (dup) conflicts.push({ index: i, entry: e, existingId: dup.id, existingWebsite: dup.website, existingAlias: dup.alias });
        });
        return { success: true, entries, conflicts };
      } else if (type === 'encrypted') {
        const tempVault = Object.create(vault);
        const result = tempVault.unlock(filePath, password);
        if (!result) return { success: false, error: 'WRONG_PASSWORD' };
        return { success: true, entries: tempVault.data.entries, conflicts: [] };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('vault:import-finalize', async (_, entries, conflictsResolved) => {
    try {
      const added = vault.importPlain(entries, (vault.state.vaults[0] || {}).id || 1, conflictsResolved);
      return { success: true, added };
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

  ipcMain.handle('clipboard:read', async () => {
    return clipboard.readText();
  });
}

function setupAppHandlers() {
  ipcMain.handle('app:get-path', async () => {
    return path.join(__dirname, '..', '..');
  });

  ipcMain.handle('app:hide-window', async () => {
    const win = getWin();
    if (win) win.hide();
    return { success: true };
  });

  ipcMain.handle('app:force-quit', async () => {
    const win = getWin();
    if (win) win.removeAllListeners('close');
    app.quit();
    return { success: true };
  });

  ipcMain.handle('log:toggle', async (_, enabled) => {
    logger.setEnabled(enabled);
    settings.set('logEnabled', enabled);
    logger.info('APP', enabled ? 'Logging enabled' : 'Logging disabled');
    return { success: true };
  });

  ipcMain.handle('log:get-dir', async () => {
    return logger.getLogDir();
  });

  ipcMain.handle('log:open-dir', async () => {
    const { shell } = require('electron');
    const dir = logger.getLogDir();
    shell.openPath(dir);
    return { success: true };
  });
}

function setupSyncHandlers() {
  ipcMain.handle('sync:test', async (_, url, username, password) => {
    return sync.testConnection({ mode: 'webdav', url, username, password });
  });

  ipcMain.handle('sync:push', async () => {
    try {
      const vaultPath = settings.get('storagePath');
      if (!vaultPath) throw new Error('未设置存储路径');
      return await sync.pushVault(vaultPath);
    } catch (e) { return { success: false, message: e.message }; }
  });

  ipcMain.handle('sync:pull', async () => {
    try {
      const vaultPath = settings.get('storagePath');
      if (!vaultPath) throw new Error('未设置存储路径');
      return await sync.pullVault(vaultPath);
    } catch (e) { return { success: false, message: e.message }; }
  });

  ipcMain.handle('sync:config', async (_, config) => {
    sync.updateConfig(config);
    settings.set('syncConfig', sync.getConfig());
    if (config.mode && config.mode !== 'none') {
      sync.startAutoSync(() => settings.get('storagePath'), getWin);
    } else {
      sync.stopAutoSync();
    }
    return { success: true };
  });

  ipcMain.handle('sync:get-config', async () => {
    return settings.get('syncConfig') || { mode: 'none', url: '', username: '', password: '', interval: 15 };
  });

  ipcMain.handle('sync:check-update', async () => {
    try {
      const cfg = settings.get('syncConfig') || {};
      if (!cfg.mode || cfg.mode === 'none') return { hasUpdate: false };

      const vaultPath = settings.get('storagePath');
      if (!vaultPath || !fs.existsSync(vaultPath)) return { hasUpdate: false };

      // read local version from header
      let localVersion = 0;
      try {
        const raw = fs.readFileSync(vaultPath, 'utf8');
        const nl = raw.indexOf('\n');
        const hdr = JSON.parse(raw.substring(0, nl));
        localVersion = hdr.v || 0;
      } catch (e) {}

      // get remote version
      const rv = await sync.getRemoteVersion();
      if (!rv.exists) return { hasUpdate: false };

      return {
        hasUpdate: rv.version > localVersion,
        localVersion,
        remoteVersion: rv.version
      };
    } catch (e) {
      return { hasUpdate: false };
    }
  });

  ipcMain.handle('sync:compare', async () => {
    try {
      const cfg = settings.get('syncConfig') || {};
      if (!cfg.mode || cfg.mode === 'none') return { ok: false, reason: '未配置同步' };

      const vaultPath = settings.get('storagePath');
      if (!vaultPath || !fs.existsSync(vaultPath)) return { ok: false, reason: '本地无文件' };

      // download remote to temp
      const os = require('os');
      const tmpPath = path.join(os.tmpdir(), 'passvault_remote.pvault');
      try { fs.unlinkSync(tmpPath); } catch (e) {}

      const pullResult = await sync.pullVault(tmpPath);
      if (!pullResult.success) return { ok: false, reason: '无法下载云端文件: ' + (pullResult.message || '') };

      // try decrypt with current vault's crypto
      const raw = fs.readFileSync(tmpPath, 'utf8');
      const nl = raw.indexOf('\n');
      const hdr = JSON.parse(raw.substring(0, nl));
      const encrypted = raw.substring(nl + 1);

      if (!vault.crypto || !vault.crypto.isUnlocked) {
        try { fs.unlinkSync(tmpPath); } catch (e) {}
        return { ok: false, reason: '密码库未解锁' };
      }

      let remoteData;
      try {
        const payloadJson = vault.crypto.decryptPayload(encrypted, hdr.payloadIv, hdr.payloadAuthTag);
        remoteData = JSON.parse(payloadJson);
      } catch (e) {
        try { fs.unlinkSync(tmpPath); } catch (e) {}
        return { ok: false, reason: '无法解密云端文件（密钥不匹配，可能是其他设备的密码库）' };
      }

      // compare entries
      const localEntries = vault.state.entries || [];
      const remoteEntries = remoteData.entries || [];
      const localMap = new Map(localEntries.map(e => [e.website + '|' + (e.alias||'') + '|' + e.account, e]));
      const remoteMap = new Map(remoteEntries.map(e => [e.website + '|' + (e.alias||'') + '|' + e.account, e]));

      const localOnly = [], remoteOnly = [], bothDiffer = [];
      localMap.forEach((e, key) => {
        if (!remoteMap.has(key)) localOnly.push(e);
        else {
          const re = remoteMap.get(key);
          if (e.password !== re.password || e.description !== re.description) bothDiffer.push({ local: e, remote: re });
        }
      });
      remoteMap.forEach((e, key) => { if (!localMap.has(key)) remoteOnly.push(e); });

      const hasDiff = localOnly.length > 0 || remoteOnly.length > 0 || bothDiffer.length > 0;
      try { fs.unlinkSync(tmpPath); } catch (e) {}

      return {
        ok: true,
        hasDiff,
        localVersion: vault.state.version || 0,
        remoteVersion: hdr.v || 0,
        localOnly: localOnly.map(e => ({ website: e.website, alias: e.alias, account: e.account })),
        remoteOnly: remoteOnly.map(e => ({ website: e.website, alias: e.alias, account: e.account })),
        diffCount: bothDiffer.length,
        localTotal: localEntries.length,
        remoteTotal: remoteEntries.length
      };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  });

  ipcMain.handle('sync:merge', async () => {
    try {
      const cfg = settings.get('syncConfig') || {};
      if (!cfg.mode || cfg.mode === 'none') throw new Error('未配置同步');

      const vaultPath = settings.get('storagePath');
      if (!vaultPath) throw new Error('无本地文件');

      // download remote
      const os = require('os');
      const tmpPath = path.join(os.tmpdir(), 'passvault_remote.pvault');
      try { fs.unlinkSync(tmpPath); } catch (e) {}
      const pullResult = await sync.pullVault(tmpPath);
      if (!pullResult.success) throw new Error('下载失败');

      // decrypt remote
      const raw = fs.readFileSync(tmpPath, 'utf8');
      const nl = raw.indexOf('\n');
      const hdr = JSON.parse(raw.substring(0, nl));
      const encrypted = raw.substring(nl + 1);
      const payloadJson = vault.crypto.decryptPayload(encrypted, hdr.payloadIv, hdr.payloadAuthTag);
      const remoteData = JSON.parse(payloadJson);

      // merge: add remote entries not in local
      const localEntries = vault.state.entries || [];
      const localKeys = new Set(localEntries.map(e => e.website + '|' + e.alias + '|' + e.account));
      let added = 0;
      for (const re of (remoteData.entries || [])) {
        const key = re.website + '|' + (re.alias || '') + '|' + re.account;
        if (!localKeys.has(key)) {
          const vaultId = (vault.state.vaults[0] || {}).id || 1;
          const v = vault.state.vaults.find(x => x.id === vaultId);
          const id = v ? v.nextId++ : Date.now();
          re.id = id;
          re.vaultIds = [vaultId];
          vault.state.entries.push(re);
          added++;
        }
      }
      vault.save();
      try { fs.unlinkSync(tmpPath); } catch (e) {}
      return { success: true, added };
    } catch (e) {
      return { success: false, added: 0, error: e.message };
    }
  });
}

module.exports = { registerIpcHandlers };
