const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  unlock: (password) => ipcRenderer.invoke('vault:unlock', password),
  unlockWithKey: (key) => ipcRenderer.invoke('vault:unlock-with-key', key),
  lock: () => ipcRenderer.invoke('vault:lock'),
  setup: (password, keyChoice, storagePath, customKey) =>
    ipcRenderer.invoke('vault:setup', password, keyChoice, storagePath, customKey),
  save: () => ipcRenderer.invoke('vault:save'),
  getState: () => ipcRenderer.invoke('vault:get-state'),
  resetData: () => ipcRenderer.invoke('vault:reset-data'),

  addEntry: (entry) => ipcRenderer.invoke('vault:add-entry', entry),
  updateEntry: (entry) => ipcRenderer.invoke('vault:update-entry', entry),
  deleteEntry: (id) => ipcRenderer.invoke('vault:delete-entry', id),
  reorderEntries: (orderMap) => ipcRenderer.invoke('vault:reorder', orderMap),
  restoreEntry: (id) => ipcRenderer.invoke('vault:restore-entry', id),
  clearTrash: () => ipcRenderer.invoke('vault:clear-trash'),

  addVault: (name) => ipcRenderer.invoke('vault:add-vault', name),
  deleteVault: (id, action) => ipcRenderer.invoke('vault:delete-vault', id, action),
  renameVault: (id, name) => ipcRenderer.invoke('vault:rename-vault', id, name),
  reorderVaults: (order) => ipcRenderer.invoke('vault:reorder-vaults', order),

  exportPlain: (path) => ipcRenderer.invoke('vault:export-plain', path),
  exportEncrypted: (path) => ipcRenderer.invoke('vault:export-encrypted', path),
  importFile: (filePath, type, password) => ipcRenderer.invoke('vault:import', filePath, type, password),
  importResolveConflict: (resolution) => ipcRenderer.invoke('vault:import-resolve', resolution),

  changeMasterPassword: (oldPw, newPw) => ipcRenderer.invoke('vault:change-master', oldPw, newPw),
  regenerateKey: (password) => ipcRenderer.invoke('vault:regenerate-key', password),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  checkStoragePath: (filePath) => ipcRenderer.invoke('check-storage-path', filePath),
  generateKey: () => ipcRenderer.invoke('key:generate-random'),
  pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
  pickFile: (filters) => ipcRenderer.invoke('dialog:pick-file', filters),
  saveFile: (filters) => ipcRenderer.invoke('dialog:save-file', filters),

  copyToClipboard: (text, duration) => ipcRenderer.invoke('clipboard:copy', text, duration),
  getAppPath: () => ipcRenderer.invoke('app:get-path'),
  toggleLog: (enabled) => ipcRenderer.invoke('log:toggle', enabled),

  onCloseRequest: (callback) => ipcRenderer.on('app:close-request', callback),
  onSyncStatus: (callback) => ipcRenderer.on('sync:status', (_, status) => callback(status))
});
