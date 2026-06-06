const { createClient } = require('webdav');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let client = null;
let syncTimer = null;
let syncConfig = { url: '', username: '', password: '', interval: 15, mode: 'none' };

function getClient() {
  if (!syncConfig.url || !syncConfig.username || !syncConfig.password) return null;
  if (!client) {
    client = createClient(syncConfig.url, {
      username: syncConfig.username,
      password: syncConfig.password
    });
  }
  return client;
}

function resetClient() {
  client = null;
}

async function testConnection(url, username, password) {
  try {
    const testClient = createClient(url, { username, password });
    const contents = await testClient.getDirectoryContents('/');
    return { success: true, message: '连接成功，目录可访问' };
  } catch (e) {
    return { success: false, message: '连接失败: ' + (e.message || e) };
  }
}

async function pushVault(vaultPath) {
  const cl = getClient();
  if (!cl) throw new Error('WebDAV 未配置');
  if (!fs.existsSync(vaultPath)) throw new Error('本地密码库文件不存在');

  const data = fs.readFileSync(vaultPath);
  const remotePath = '/passvault/vault.pvault';

  // ensure remote dir exists
  try { await cl.createDirectory('/passvault'); } catch (e) {}

  await cl.putFileContents(remotePath, data, { overwrite: true });
  logger.sync('PUSH', { remotePath, size: data.length });
  return { success: true, size: data.length };
}

async function pullVault(vaultPath) {
  const cl = getClient();
  if (!cl) throw new Error('WebDAV 未配置');

  const remotePath = '/passvault/vault.pvault';

  let exists = false;
  try {
    await cl.stat(remotePath);
    exists = true;
  } catch (e) {
    return { success: false, message: '服务器上未找到密码库文件' };
  }

  const data = await cl.getFileContents(remotePath, { format: 'binary' });
  if (!data || data.length === 0) return { success: false, message: '远程文件为空' };

  // backup local before overwrite
  if (fs.existsSync(vaultPath)) {
    fs.copyFileSync(vaultPath, vaultPath + '.syncbak');
  }

  const dir = path.dirname(vaultPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(vaultPath, data);
  logger.sync('PULL', { remotePath, size: data.length });
  return { success: true, size: data.length };
}

async function getRemoteInfo() {
  const cl = getClient();
  if (!cl) throw new Error('WebDAV 未配置');

  try {
    const stat = await cl.stat('/passvault/vault.pvault');
    return {
      exists: true,
      size: stat.size,
      modified: stat.lastmod
    };
  } catch (e) {
    return { exists: false };
  }
}

function startAutoSync(getVaultPath, getWin) {
  if (!syncConfig.mode || syncConfig.mode === 'none') return;
  if (syncTimer) clearInterval(syncTimer);

  const ms = (syncConfig.interval || 15) * 60 * 1000;

  async function doSync() {
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath || !fs.existsSync(vaultPath)) return;

      const cl = getClient();
      if (!cl) return;

      // push to remote
      await pushVault(vaultPath);
      if (getWin()) {
        getWin().webContents.send('sync:status', { type: 'synced', time: new Date().toISOString() });
      }
    } catch (e) {
      logger.sync('ERROR', e.message);
      if (getWin()) {
        getWin().webContents.send('sync:status', { type: 'error', message: e.message });
      }
    }
  }

  syncTimer = setInterval(doSync, ms);
  logger.sync('AUTO_START', { interval: syncConfig.interval + 'min' });
}

function stopAutoSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    logger.sync('AUTO_STOP', {});
  }
}

function updateConfig(config) {
  if (config.url !== undefined) syncConfig.url = config.url;
  if (config.username !== undefined) syncConfig.username = config.username;
  if (config.password !== undefined) syncConfig.password = config.password;
  if (config.interval !== undefined) syncConfig.interval = config.interval;
  if (config.mode !== undefined) syncConfig.mode = config.mode;
  resetClient();
}

function getConfig() {
  return { ...syncConfig };
}

module.exports = {
  testConnection, pushVault, pullVault, getRemoteInfo,
  startAutoSync, stopAutoSync, updateConfig, getConfig, resetClient
};
