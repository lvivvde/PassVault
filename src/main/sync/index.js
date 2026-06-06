// SyncManager — dispatches to registered providers
// Implements rules from docs/SYNC_RULES.md
const fs = require('fs');
const logger = require('../logger');
const WebDAVProvider = require('./providers/webdav');
const FolderProvider = require('./providers/folder');

let provider = null;
let syncTimer = null;
let syncConfig = { mode: 'none', interval: 15 };

const providers = {
  webdav: (cfg) => new WebDAVProvider(cfg),
  folder: (cfg) => new FolderProvider(cfg)
};

function getProvider() { return provider; }
function resetProvider() { provider = null; stopAutoSync(); }

function createProvider(config) {
  const factory = providers[config.mode];
  return factory ? factory(config) : null;
}

async function testConnection(config) {
  const p = createProvider(config);
  if (!p) return { success: false, message: '暂不支持这种同步方式，请选择 WebDAV 或本地文件夹' };
  return p.test();
}

// ─── Core Sync Logic ────────────────────────────────────────

/**
 * Compare local vault metadata with remote.
 * Returns a sync decision object:
 *   { action: 'none'|'upload'|'download'|'conflict', reason, ... }
 */
async function compare(localMeta, vaultPath, remoteDecrypt) {
  if (!provider) return { action: 'none', reasonKey: 'sync.notConfigured' };
  if (syncConfig.mode === 'none') return { action: 'none', reasonKey: 'sync.disabled' };

  const localExists = !!vaultPath && fs.existsSync(vaultPath);
  const remote = await getRemoteMeta();
  const remoteExists = remote.exists;

  // 5.1 Both missing
  if (!localExists && !remoteExists) {
    return { action: 'none', reasonKey: 'sync.noCloudFile' };
  }

  // 5.2 Local exists, remote missing
  if (localExists && !remoteExists) {
    return { action: 'upload', reasonKey: 'sync.noCloudFile', safeAuto: true };
  }

  // 5.3 Local missing, remote exists
  if (!localExists && remoteExists) {
    return { action: 'download', reasonKey: 'sync.noLocalFile', safeAuto: true };
  }

  // 5.4 Both exist — complex comparison

  // §3 key verification
  const canDecryptRemote = remoteDecrypt ? remoteDecrypt.canDecrypt : true;
  if (!canDecryptRemote) {
    return { action: 'conflict', reasonKey: 'sync.keyMismatch',
      type: 'key_mismatch',
      canDecryptLocal: !!localMeta,
      canDecryptRemote: false };
  }

  // §6 vaultId check
  if (localMeta.vaultId && remote.vaultId && localMeta.vaultId !== remote.vaultId) {
    return { action: 'conflict', reasonKey: 'sync.differentVault', type: 'different_vault' };
  }

  // 7. contentHash check
  if (localMeta.contentHash && remote.contentHash && localMeta.contentHash === remote.contentHash) {
    return { action: 'none', reasonKey: 'sync.sameContent', safeAuto: true };
  }

  const lv = localMeta.version || 0;
  const rv = remote.version || 0;
  const lSync = localMeta.lastSyncVersion || 0;

  logger.sync('COMPARE', { lv, rv, lSync, localHash: localMeta.contentHash?.slice(0,8), remoteHash: remote.contentHash?.slice(0,8) });

  // 9. Local > Remote
  if (lv > rv) {
    // 9.1 First sync, or safe upload, or remote uninitialized (rv===0)
    if (lSync === 0 || lSync === rv || rv === 0) {
      // 12. 删除检测
      const localCount = localMeta.itemCount || 0;
      const remoteCount = remote.itemCount || 0;
      const deleted = remoteCount - localCount;
      if (remoteCount > 0 && (deleted >= 5 || deleted / remoteCount >= 0.3)) {
        return { action: 'conflict', reasonKey: 'sync.massDelete', type: 'mass_delete',
          localCount, remoteCount, deleted };
      }
      return { action: 'upload', reasonKey: 'sync.firstSync', safeAuto: true,
        localVersion: lv, remoteVersion: rv };
    }
    // 9.2 Conflict: both modified
    return { action: 'conflict', reasonKey: 'sync.bothModified',
      type: 'both_modified',
      localVersion: lv, remoteVersion: rv, lastSyncVersion: lSync };
  }

  // 10. Remote > Local
  if (rv > lv) {
    // 10.1 Safe download (no local changes since last sync, or never synced)
    if (lv === lSync || lSync === 0) {
      return { action: 'download', reasonKey: 'sync.cloudUpdate', safeAuto: true,
        localVersion: lv, remoteVersion: rv };
    }
    // 10.2 Conflict
    return { action: 'conflict', reasonKey: 'sync.bothModified', type: 'both_modified',
      localVersion: lv, remoteVersion: rv, lastSyncVersion: lSync };
  }

  // 11. Same version but content differs
  if (lSync === 0) {
    return { action: 'upload', reasonKey: 'sync.firstSync', safeAuto: true,
      localVersion: lv, remoteVersion: rv };
  }
  return { action: 'conflict', reasonKey: 'sync.hashMismatch', type: 'hash_mismatch',
    localVersion: lv, remoteVersion: rv };
}

async function getRemoteMeta() {
  if (!provider) return { exists: false };
  try {
    return await provider.getRemoteVersion();
  } catch (e) {
    return { exists: false };
  }
}

/**
 * Execute upload with backup
 */
async function pushVault(localPath) {
  if (!provider) throw new Error('同步方式未配置');
  // backup: download remote first as .pvbak
  try {
    const remote = await getRemoteMeta();
    if (remote.exists) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      await provider.pull(localPath + `.remote_backup_${ts}.pvbak`);
    }
  } catch (e) { /* backup optional */ }
  return provider.push(localPath);
}

/**
 * Execute download with backup
 */
async function pullVault(localPath) {
  if (!provider) throw new Error('同步方式未配置');
  // backup local before overwrite
  if (fs.existsSync(localPath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.copyFileSync(localPath, localPath + `.local_backup_${ts}.pvbak`);
  }
  return provider.pull(localPath);
}

async function getRemoteInfo() {
  if (!provider) throw new Error('同步方式未配置');
  return provider.getInfo();
}

async function getRemoteVersion() {
  if (!provider) return { exists: false, version: 0 };
  return provider.getRemoteVersion ? provider.getRemoteVersion() : provider.getInfo();
}

function startAutoSync(getVaultPath, getWin) {
  if (!provider || syncConfig.mode === 'none') return;
  if (syncTimer) clearInterval(syncTimer);
  const ms = (syncConfig.interval || 15) * 60 * 1000;

  async function doSync() {
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath || !fs.existsSync(vaultPath)) return;
      await provider.push(vaultPath);
      if (getWin()) getWin().webContents.send('sync:status', { type: 'synced', time: new Date().toISOString() });
    } catch (e) {
      logger.sync('ERROR', e.message);
      if (getWin()) getWin().webContents.send('sync:status', { type: 'error', message: e.message });
    }
  }
  syncTimer = setInterval(doSync, ms);
  logger.sync('AUTO_START', { mode: syncConfig.mode, interval: syncConfig.interval + 'min' });
}

function stopAutoSync() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

function updateConfig(config) {
  if (config.mode !== undefined) syncConfig.mode = config.mode;
  if (config.url !== undefined) syncConfig.url = config.url;
  if (config.username !== undefined) syncConfig.username = config.username;
  if (config.password !== undefined) syncConfig.password = config.password;
  if (config.path !== undefined) syncConfig.path = config.path;
  if (config.interval !== undefined) syncConfig.interval = config.interval;
  resetProvider();
  if (syncConfig.mode && syncConfig.mode !== 'none') {
    provider = createProvider(syncConfig);
  }
}

function getConfig() { return { ...syncConfig }; }

function registerProvider(name, factory) { providers[name] = factory; }

module.exports = {
  testConnection, pushVault, pullVault, getRemoteInfo, getRemoteVersion,
  compare, startAutoSync, stopAutoSync, updateConfig, getConfig,
  getProvider, registerProvider
};
