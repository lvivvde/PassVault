const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { VaultCrypto, deriveKey, generateSalt, hashSha256, encrypt } = require('./crypto');
const logger = require('./logger');

class VaultService {
  constructor() {
    this.vaultPath = null;
    this.data = null;
    this.recoveryKeyDisplay = null;
    this._crypto = null;
    this._meta = {}; // { vaultId, deviceId, version, lastSyncVersion }
  }

  get crypto() { return this._crypto; }
  set crypto(c) { this._crypto = c; }

  get isUnlocked() {
    return this.data !== null && this.crypto && this.crypto.isUnlocked;
  }

  get state() {
    if (!this.isUnlocked) return { status: 'locked', hasVault: !!this.vaultPath };
    return {
      status: 'unlocked',
      hasVault: true,
      vaults: this.data.vaults,
      entries: this.data.entries,
      trash: this.data.trash || [],
      version: this._meta.version || 0,
      vaultId: this._meta.vaultId || '',
      deviceId: this._meta.deviceId || '',
      lastSyncVersion: this._meta.lastSyncVersion || 0,
      contentHash: this._meta.contentHash || '',
      itemCount: this._meta.itemCount || 0,
      recoveryKeyHint: this.recoveryKeyDisplay
        ? `${this.recoveryKeyDisplay.slice(0, 4)}****${this.recoveryKeyDisplay.slice(-4)}`
        : null
    };
  }

  create(password, keyChoice, customKey, storagePath) {
    const vc = new VaultCrypto();
    vc.setupFromMasterPassword(password);
    logger.crypto('SETUP_MASTER', { salt: vc.masterKeySalt.toString('hex').slice(0,8) });

    let recoveryKey = customKey;
    if (!recoveryKey) {
      recoveryKey = vc.generateRecoveryKey();
    } else {
      vc.setCustomRecoveryKey(recoveryKey);
    }

    const kek = deriveKey(password, vc.masterKeySalt);
    const { encrypted, iv, authTag } = encrypt(vc.rek.toString('hex'), kek);
    vc.encryptedRek = encrypted;
    vc.rekIv = iv;
    vc.rekAuthTag = authTag;
    vc.rekHash = hashSha256(vc.rek);
    this.recoveryKeyDisplay = recoveryKey;

    this._meta = {
      vaultId: hashSha256(crypto.randomBytes(16)).slice(0, 12),
      deviceId: hashSha256(crypto.randomBytes(8) + require('os').hostname()).slice(0, 8),
      version: 1,
      lastSyncVersion: 0
    };

    this.data = {
      vaults: [
        { id: 1, name: '默认', idPrefix: 10000, nextId: 10001, createdAt: new Date().toISOString() }
      ],
      entries: [],
      trash: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.crypto = vc;
    this.vaultPath = storagePath || path.join(
      require('electron').app.getPath('userData'), 'PassVault', 'vault.pvault'
    );
    this.save();
    logger.vault('CREATE', { path: this.vaultPath, vaults: this.data.vaults.length });

    return { recoveryKey };
  }

  save() {
    if (!this.isUnlocked) return;
    this.data.updatedAt = new Date().toISOString();

    this._meta.version = (this._meta.version || 0) + 1;
    if (!this._meta.lastSyncVersion) this._meta.lastSyncVersion = 0;

    const payloadJson = JSON.stringify(this.data);
    this._meta.contentHash = hashSha256(payloadJson).slice(0, 16);
    this._meta.itemCount = (this.data.entries || []).length;

    const { encrypted, iv, authTag } = this.crypto.encryptPayload(payloadJson);
    const header = this.crypto.exportHeader();
    header.payloadIv = iv;
    header.payloadAuthTag = authTag;

    // sync metadata in header (unencrypted, readable by sync logic)
    header.vaultId = this._meta.vaultId;
    header.deviceId = this._meta.deviceId;
    header.version = this._meta.version;
    header.lastSyncVersion = this._meta.lastSyncVersion;
    header.contentHash = this._meta.contentHash;
    header.itemCount = this._meta.itemCount;

    const headerJson = JSON.stringify(header);
    const content = headerJson + '\n' + encrypted;

    const dir = path.dirname(this.vaultPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(this.vaultPath)) {
      const bakPath = this.vaultPath + '.bak';
      fs.copyFileSync(this.vaultPath, bakPath);
    }

    const tmpPath = this.vaultPath + '.tmp';
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, this.vaultPath);
  }

  load(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const newlineIndex = raw.indexOf('\n');
    const headerJson = raw.substring(0, newlineIndex);
    const encrypted = raw.substring(newlineIndex + 1);
    const header = JSON.parse(headerJson);

    // restore sync metadata
    this._meta = {
      vaultId: header.vaultId || '',
      deviceId: header.deviceId || '',
      version: header.version || 0,
      lastSyncVersion: header.lastSyncVersion || 0,
      contentHash: header.contentHash || '',
      itemCount: header.itemCount || 0
    };

    const vc = new VaultCrypto();
    vc.importHeader(header);
    return { crypto: vc, encrypted, header };
  }

  unlock(filePath, password) {
    this.vaultPath = filePath;
    const { crypto: cv, encrypted, header } = this.load(filePath);
    if (!cv.unlockWithMasterPassword(password)) return false;
    const payloadJson = cv.decryptPayload(encrypted, header.payloadIv, header.payloadAuthTag);
    this.data = JSON.parse(payloadJson);
    if (!this.data.trash) this.data.trash = [];
    this.crypto = cv;
    logger.vault('UNLOCK_MP', { entries: this.data.entries.length, vaults: this.data.vaults.length });
    return true;
  }

  unlockWithKey(filePath, key) {
    this.vaultPath = filePath;
    const { crypto: cv, encrypted, header } = this.load(filePath);
    if (!cv.unlockWithRecoveryKey(key, cv.keySalt)) return false;
    const payloadJson = cv.decryptPayload(encrypted, header.payloadIv, header.payloadAuthTag);
    this.data = JSON.parse(payloadJson);
    if (!this.data.trash) this.data.trash = [];
    this.crypto = cv;
    logger.vault('UNLOCK_KEY', { entries: this.data.entries.length, vaults: this.data.vaults.length });
    return true;
  }

  lock() {
    if (this.crypto) this.crypto.lock();
    this.data = null;
  }

  resetData() {
    this.data = null;
    this.crypto = null;
    this.recoveryKeyDisplay = null;
    this._meta = {};
  }

  addEntry(entry) {
    if (!entry.vaultIds || !entry.vaultIds.length) throw new Error('至少选择一个密码库');
    const created = [];
    for (const vaultId of entry.vaultIds) {
      const vault = this.data.vaults.find(v => v.id === vaultId);
      if (!vault) throw new Error('Vault not found: ' + vaultId);
      const id = vault.nextId;
      vault.nextId++;
      const newEntry = {
        id,
        website: entry.website,
        alias: entry.alias,
        account: entry.account,
        password: entry.password,
        description: entry.description || '',
        vaultIds: [vaultId],
        visible: entry.visible !== false,
        order: this.data.entries.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.data.entries.push(newEntry);
      created.push(newEntry);
      logger.vault('ADD_ENTRY', { id, website: entry.website, vaultId, vaultName: vault.name });
    }
    this.save();
    return created;
  }

  updateEntry(updated) {
    const idx = this.data.entries.findIndex(e => e.id === updated.id);
    if (idx === -1) throw new Error('Entry not found');
    this.data.entries[idx] = {
      ...this.data.entries[idx],
      website: updated.website,
      alias: updated.alias,
      account: updated.account,
      password: updated.password,
      description: updated.description || '',
      vaultIds: updated.vaultIds,
      visible: updated.visible,
      updatedAt: new Date().toISOString()
    };
    this.save();
    logger.vault('UPDATE_ENTRY', { id: updated.id });
    return this.data.entries[idx];
  }

  deleteEntry(id) {
    const idx = this.data.entries.findIndex(e => e.id === id);
    if (idx === -1) return false;
    const [deleted] = this.data.entries.splice(idx, 1);
    this.data.trash.push({ entry: deleted, deletedAt: new Date().toISOString() });
    this.save();
    logger.vault('DELETE_ENTRY', { id, website: deleted.website });
    return true;
  }

  restoreEntry(id) {
    const tIdx = this.data.trash.findIndex(t => t.entry.id === id);
    if (tIdx === -1) return false;
    const [item] = this.data.trash.splice(tIdx, 1);
    this.data.entries.push(item.entry);
    this.save();
    return true;
  }

  clearTrash() {
    this.data.trash = [];
    this.save();
  }

  addVault(name) {
    const maxPrefix = this.data.vaults.reduce((max, v) => Math.max(max, v.idPrefix), 0);
    const idPrefix = maxPrefix + 10000;
    const vault = {
      id: idPrefix / 10000,
      name,
      idPrefix,
      nextId: idPrefix + 1,
      createdAt: new Date().toISOString()
    };
    this.data.vaults.push(vault);
    this.save();
    return vault;
  }

  deleteVault(vaultId, action) {
    const idx = this.data.vaults.findIndex(v => v.id === vaultId);
    if (idx === -1) return false;

    const vault = this.data.vaults[idx];
    const vaultEntries = this.data.entries.filter(e => e.vaultIds.includes(vaultId));

    if (action === 'delete') {
      vaultEntries.forEach(e => {
        e.vaultIds = e.vaultIds.filter(v => v !== vaultId);
        if (e.vaultIds.length === 0) {
          const eIdx = this.data.entries.indexOf(e);
          this.data.entries.splice(eIdx, 1);
          this.data.trash.push({ entry: e, deletedAt: new Date().toISOString() });
        }
      });
    } else {
      const firstVault = this.data.vaults[0];
      if (firstVault.id === vaultId) {
        const secondVault = this.data.vaults[1];
        vaultEntries.forEach(e => {
          e.vaultIds = e.vaultIds.filter(v => v !== vaultId);
          if (!e.vaultIds.includes(secondVault.id)) e.vaultIds.push(secondVault.id);
          if (e.vaultIds.length === 0) e.vaultIds.push(secondVault.id);
        });
      } else {
        vaultEntries.forEach(e => {
          e.vaultIds = e.vaultIds.filter(v => v !== vaultId);
          if (!e.vaultIds.includes(firstVault.id)) e.vaultIds.push(firstVault.id);
          if (e.vaultIds.length === 0) e.vaultIds.push(firstVault.id);
        });
      }
    }

    this.data.vaults.splice(idx, 1);
    this.save();
    return true;
  }

  renameVault(vaultId, name) {
    const vault = this.data.vaults.find(v => v.id === vaultId);
    if (!vault) return false;
    vault.name = name;
    this.save();
    return true;
  }

  reorderVaults(order) {
    const map = new Map(this.data.vaults.map(v => [v.id, v]));
    this.data.vaults = order.map(id => map.get(id)).filter(Boolean);
    this.save();
  }

  reorderEntries(orderMap) {
    this.data.entries.forEach(e => { if (orderMap[e.id] !== undefined) e.order = orderMap[e.id]; });
    this.data.entries.sort((a, b) => a.order - b.order);
    this.save();
  }

  // reload data from file without re-unlocking (for sync pull)
  reloadState(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const nl = raw.indexOf('\n');
    const hdr = JSON.parse(raw.substring(0, nl));
    const encrypted = raw.substring(nl + 1);
    const payloadJson = this.crypto.decryptPayload(encrypted, hdr.payloadIv, hdr.payloadAuthTag);
    this.data = JSON.parse(payloadJson);
    this._meta = { vaultId: hdr.vaultId || '', deviceId: hdr.deviceId || '', version: hdr.version || 0, lastSyncVersion: hdr.lastSyncVersion || 0, contentHash: hdr.contentHash || '', itemCount: hdr.itemCount || 0 };
  }

  changeMasterPassword(oldPassword, newPassword) {
    if (!this.crypto.unlockWithMasterPassword(oldPassword)) return false;
    const mpSalt = generateSalt();
    const kek = deriveKey(newPassword, mpSalt);
    const { encrypted, iv, authTag } = this.crypto.encryptPayload(this.crypto.rek.toString('hex'));
    this.crypto.masterKeySalt = mpSalt;
    this.crypto.encryptedRek = encrypted;
    this.crypto.rekIv = iv;
    this.crypto.rekAuthTag = authTag;
    this.save();
    return true;
  }

  regenerateRecoveryKey(password) {
    const newKey = this.crypto.regenerateRecoveryKey(password);
    this.recoveryKeyDisplay = newKey;
    this.save();
    return newKey;
  }

  exportPlain() {
    return this.data.entries.map(e => ({
      website: e.website,
      alias: e.alias,
      account: e.account,
      password: e.password,
      description: e.description,
      visible: e.visible
    }));
  }

  importPlain(entries, targetVaultId, conflictsMap) {
    let added = 0;
    for (const entry of entries) {
      const existingIdx = this.data.entries.findIndex(
        e => e.website === entry.website && e.alias === entry.alias && e.account === entry.account
      );
      if (existingIdx !== -1) {
        const resolution = conflictsMap[existingIdx];
        if (resolution === 'skip') continue;
        if (resolution === 'overwrite') {
          this.data.entries[existingIdx] = {
            ...this.data.entries[existingIdx],
            password: entry.password,
            description: entry.description || ''
          };
          added++;
          continue;
        }
      }
      const vaultIds = entry.vaultIds || [targetVaultId];
      if (!vaultIds.length) vaultIds.push(targetVaultId);
      this.addEntry({ ...entry, vaultIds });
      added++;
    }
    this.save();
    return added;
  }
}

const vaultService = new VaultService();
module.exports = vaultService;
