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
  if (!p) return { success: false, message: '不支持的同步方式' };
  return p.test();
}

// ─── Core Sync Logic ────────────────────────────────────────

/**
 * Compare local vault metadata with remote.
 * Returns a sync decision object:
 *   { action: 'none'|'upload'|'download'|'conflict', reason, ... }
 */
async function compare(localMeta, vaultPath, remoteDecrypt) {
  if (!provider) return { action: 'none', reason: '未配置同步' };
  if (syncConfig.mode === 'none') return { action: 'none', reason: '同步未启用' };

  const localExists = !!vaultPath && fs.existsSync(vaultPath);
  const remote = await getRemoteMeta();
  const remoteExists = remote.exists;

  // 5.1 Both missing
  if (!localExists && !remoteExists) {
    return { action: 'none', reason: '本地和云端均无文件' };
  }

  // 5.2 Local exists, remote missing
  if (localExists && !remoteExists) {
    return { action: 'upload', reason: '云端无文件', safeAuto: true };
  }

  // 5.3 Local missing, remote exists
  if (!localExists && remoteExists) {
    return { action: 'download', reason: '本地无文件', safeAuto: true };
  }

  // 5.4 Both exist — complex comparison

  // §3 key verification
  const canDecryptRemote = remoteDecrypt ? remoteDecrypt.canDecrypt : true;
  if (!canDecryptRemote) {
    return { action: 'conflict', reason: '密钥不匹配',
      type: 'key_mismatch',
      canDecryptLocal: !!localMeta,
      canDecryptRemote: false };
  }

  // §6 vaultId check
  if (localMeta.vaultId && remote.vaultId && localMeta.vaultId !== remote.vaultId) {
    return { action: 'conflict', reason: 'vaultId不一致', type: 'different_vault' };
  }

  // 7. contentHash check
  if (localMeta.contentHash && remote.contentHash && localMeta.contentHash === remote.contentHash) {
    return { action: 'none', reason: '内容一致', safeAuto: true };
  }

  const lv = localMeta.version || 0;
  const rv = remote.version || 0;
  const lSync = localMeta.lastSyncVersion || 0;

  // 9. Local > Remote
  if (lv > rv) {
    // 9.1 First sync (lSync===0) or safe upload
    if (lSync === 0 || lSync === rv) {
      // 12. 删除检测
      const localCount = localMeta.itemCount || 0;
      const remoteCount = remote.itemCount || 0;
      const deleted = remoteCount - localCount;
      if (remoteCount > 0 && (deleted >= 5 || deleted / remoteCount >= 0.3)) {
        return { action: 'conflict', reason: '大量删除风险', type: 'mass_delete',
          localCount, remoteCount, deleted };
      }
      return { action: 'upload', reason: '本地更新', safeAuto: true,
        localVersion: lv, remoteVersion: rv };
    }
    // 9.2 Conflict: both modified
    return { action: 'conflict', reason: '双方都修改过', type: 'both_modified',
      localVersion: lv, remoteVersion: rv, lastSyncVersion: lSync };
  }

  // 10. Remote > Local
  if (rv > lv) {
    // 10.1 Safe download
    if (lv === lSync) {
      return { action: 'download', reason: '云端更新', safeAuto: true,
        localVersion: lv, remoteVersion: rv };
    }
    // 10.2 Conflict
    return { action: 'conflict', reason: '双方都修改过', type: 'both_modified',
      localVersion: lv, remoteVersion: rv, lastSyncVersion: lSync };
  }

  // 11. Same version but content differs
  return { action: 'conflict', reason: '版本相同内容不同', type: 'hash_mismatch',
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
