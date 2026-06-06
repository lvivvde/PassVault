// WebDAV Sync Provider
// Implements: test / push / pull / getInfo
// Uses dynamic import because webdav v5+ is ESM-only
const fs = require('fs');
const path = require('path');
const logger = require('../../logger');

let webdavModule = null;
async function getWebDAV() {
  if (!webdavModule) webdavModule = await import('webdav');
  return webdavModule;
}

class WebDAVProvider {
  constructor(config) {
    this.config = config; // { url, username, password }
    this.client = null;
  }

  async getClient() {
    if (!this.client) {
      const { createClient } = await getWebDAV();
      this.client = createClient(this.config.url, {
        username: this.config.username,
        password: this.config.password
      });
    }
    return this.client;
  }

  async test() {
    try {
      const { createClient } = await getWebDAV();
      const cl = createClient(this.config.url, {
        username: this.config.username,
        password: this.config.password
      });
      await cl.getDirectoryContents('/');
      return { success: true, message: '连接成功' };
    } catch (e) {
      return { success: false, message: '连接失败: ' + (e.message || e) };
    }
  }

  async push(localPath) {
    if (!fs.existsSync(localPath)) throw new Error('本地文件不存在');
    const data = fs.readFileSync(localPath);
    const cl = await this.getClient();
    try { await cl.createDirectory('/passvault'); } catch (e) {}
    await cl.putFileContents('/passvault/vault.pvault', data, { overwrite: true });
    logger.sync('WEBDAV_PUSH', { size: data.length });
    return { success: true, size: data.length };
  }

  async pull(localPath) {
    const cl = await this.getClient();
    let exists = false;
    try { await cl.stat('/passvault/vault.pvault'); exists = true; } catch (e) {}
    if (!exists) return { success: false, message: '服务器上未找到密码库' };

    const data = await cl.getFileContents('/passvault/vault.pvault', { format: 'binary' });
    if (!data || data.length === 0) return { success: false, message: '远程文件为空' };

    if (fs.existsSync(localPath)) fs.copyFileSync(localPath, localPath + '.syncbak');
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localPath, data);

    logger.sync('WEBDAV_PULL', { size: data.length });
    return { success: true, size: data.length };
  }

  async getInfo() {
    try {
      const cl = await this.getClient();
      const stat = await cl.stat('/passvault/vault.pvault');
      return { exists: true, size: stat.size, modified: stat.lastmod };
    } catch (e) {
      return { exists: false };
    }
  }
}

module.exports = WebDAVProvider;
