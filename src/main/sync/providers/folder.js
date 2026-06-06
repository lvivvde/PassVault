// Local Folder Sync Provider
// Implements: test / push / pull / getInfo
const fs = require('fs');
const path = require('path');
const logger = require('../../logger');

class FolderProvider {
  constructor(config) {
    this.config = config; // { path: '/some/folder' }
  }

  async test() {
    try {
      if (!this.config.path) return { success: false, message: '未设置文件夹路径' };
      if (!fs.existsSync(this.config.path)) return { success: false, message: '文件夹不存在' };
      return { success: true, message: '文件夹可访问' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async push(localPath) {
    if (!fs.existsSync(localPath)) throw new Error('本地文件不存在');
    const destPath = path.join(this.config.path, 'vault.pvault');
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(localPath, destPath);
    const stat = fs.statSync(localPath);
    logger.sync('FOLDER_PUSH', { dest: destPath, size: stat.size });
    return { success: true, size: stat.size };
  }

  async pull(localPath) {
    const srcPath = path.join(this.config.path, 'vault.pvault');
    if (!fs.existsSync(srcPath)) return { success: false, message: '同步文件夹中未找到密码库' };

    const stat = fs.statSync(srcPath);
    if (stat.size === 0) return { success: false, message: '远程文件为空' };

    if (fs.existsSync(localPath)) fs.copyFileSync(localPath, localPath + '.syncbak');
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(srcPath, localPath);

    logger.sync('FOLDER_PULL', { src: srcPath, size: stat.size });
    return { success: true, size: stat.size };
  }

  async getInfo() {
    try {
      const p = path.join(this.config.path, 'vault.pvault');
      if (!fs.existsSync(p)) return { exists: false };
      const stat = fs.statSync(p);
      return { exists: true, size: stat.size, modified: stat.mtime.toISOString() };
    } catch (e) {
      return { exists: false };
    }
  }

  async getRemoteVersion() {
    try {
      const p = path.join(this.config.path, 'vault.pvault');
      if (!fs.existsSync(p)) return { exists: false, version: 0 };
      const raw = fs.readFileSync(p, 'utf8');
      const nl = raw.indexOf('\n');
      const hdr = JSON.parse(raw.substring(0, nl));
      return { exists: true, version: hdr.version || 0, vaultId: hdr.vaultId || '', contentHash: hdr.contentHash || '', itemCount: hdr.itemCount || 0 };
    } catch (e) {
      return { exists: false, version: 0 };
    }
  }
}

module.exports = FolderProvider;
