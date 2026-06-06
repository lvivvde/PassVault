const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { VaultCrypto, deriveKey, generateSalt, hashSha256 } = require('./crypto');

class VaultService {
  constructor() {
    this.vaultPath = null;
    this.data = null;
    this.recoveryKeyDisplay = null;
    this._crypto = null;
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
      recoveryKeyHint: this.recoveryKeyDisplay
        ? `${this.recoveryKeyDisplay.slice(0, 4)}****${this.recoveryKeyDisplay.slice(-4)}`
        : null
    };
  }

  create(password, keyChoice, customKey, storagePath) {
    const vc = new VaultCrypto();
    vc.setupFromMasterPassword(password);

    let recoveryKey = customKey;
    if (!recoveryKey) {
      recoveryKey = vc.generateRecoveryKey();
    } else {
      vc.setCustomRecoveryKey(recoveryKey);
      vc.rekHash = hashSha256(vc.rek);
    }
    this.recoveryKeyDisplay = recoveryKey;

    this.data = {
      vaults: [
        { id: 1, name: 'Default', idPrefix: 10000, nextId: 10001, createdAt: new Date().toISOString() }
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

    return { recoveryKey };
  }

  save() {
    if (!this.isUnlocked) return;
    this.data.updatedAt = new Date().toISOString();
    const payloadJson = JSON.stringify(this.data);
    const { encrypted, iv, authTag } = this.crypto.encryptPayload(payloadJson);
    const header = this.crypto.exportHeader();
    header.payloadIv = iv;
    header.payloadAuthTag = authTag;
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

    const vc = new VaultCrypto();
    vc.importHeader(header);
    return { crypto: vc, encrypted, header };
  }

  unlock(filePath, password) {
    this.vaultPath = filePath;
    const { crypto, encrypted, header } = this.load(filePath);
    if (!crypto.unlockWithMasterPassword(password)) return false;
    const payloadJson = crypto.decryptPayload(encrypted, header.payloadIv, header.payloadAuthTag);
    this.data = JSON.parse(payloadJson);
    if (!this.data.trash) this.data.trash = [];
    this.crypto = crypto;
    return true;
  }

  unlockWithKey(filePath, key) {
    this.vaultPath = filePath;
    const { crypto, encrypted, header } = this.load(filePath);
    if (!crypto.unlockWithRecoveryKey(key, crypto.keySalt)) return false;
    const payloadJson = crypto.decryptPayload(encrypted, header.payloadIv, header.payloadAuthTag);
    this.data = JSON.parse(payloadJson);
    if (!this.data.trash) this.data.trash = [];
    this.crypto = crypto;
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
  }

  addEntry(entry) {
    const vault = this.data.vaults.find(v => v.id === entry.vaultIds[0]);
    if (!vault) throw new Error('Vault not found');
    const id = vault.nextId;
    vault.nextId++;
    const newEntry = {
      id,
      website: entry.website,
      alias: entry.alias,
      account: entry.account,
      password: entry.password,
      description: entry.description || '',
      vaultIds: entry.vaultIds,
      visible: entry.visible !== false,
      order: this.data.entries.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.entries.push(newEntry);
    this.save();
    return newEntry;
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
    return this.data.entries[idx];
  }

  deleteEntry(id) {
    const idx = this.data.entries.findIndex(e => e.id === id);
    if (idx === -1) return false;
    const [deleted] = this.data.entries.splice(idx, 1);
    this.data.trash.push({ entry: deleted, deletedAt: new Date().toISOString() });
    this.save();
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
