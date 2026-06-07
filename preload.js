const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  unlock: (password) => ipcRenderer.invoke('vault:unlock', password),
  unlockWithKey: (key) => ipcRenderer.invoke('vault:unlock-with-key', key),
  lock: () => ipcRenderer.invoke('vault:lock'),
  setup: (password, keyChoice, storagePath, customKey) =>
    ipcRenderer.invoke('vault:setup', password, keyChoice, storagePath, customKey),
  save: () => ipcRenderer.invoke('vault:save'),
  getState: () => ipcRenderer.invoke('vault:get-state'),
  reloadState: () => ipcRenderer.invoke('vault:reload-state'),
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
  verifyPassword: (password) => ipcRenderer.invoke('vault:verify-password', password),
  unhideAllEntries: () => ipcRenderer.invoke('vault:unhide-all-entries'),

  exportPlain: (path) => ipcRenderer.invoke('vault:export-plain', path),
  exportEncrypted: (path) => ipcRenderer.invoke('vault:export-encrypted', path),
  importFile: (filePath, type, password) => ipcRenderer.invoke('vault:import', filePath, type, password),
  importFinalize: (entries, conflictsResolved) => ipcRenderer.invoke('vault:import-finalize', entries, conflictsResolved),
  importResolveConflict: (resolution) => ipcRenderer.invoke('vault:import-resolve', resolution),

  parseImportFile: (filePath) => ipcRenderer.invoke('import:parse-file', filePath),
  executeImport: (filePath, mapping, targetVaultId) => ipcRenderer.invoke('import:execute', filePath, mapping, targetVaultId),

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
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  getAppPath: () => ipcRenderer.invoke('app:get-path'),
  hideWindow: () => ipcRenderer.invoke('app:hide-window'),
  forceQuit: () => ipcRenderer.invoke('app:force-quit'),
  setZoom: (factor) => ipcRenderer.invoke('app:set-zoom', factor),
  getZoom: () => ipcRenderer.invoke('app:get-zoom'),
  toggleLog: (enabled) => ipcRenderer.invoke('log:toggle', enabled),
  getLogDir: () => ipcRenderer.invoke('log:get-dir'),
  openLogDir: () => ipcRenderer.invoke('log:open-dir'),

  onCloseRequest: (callback) => ipcRenderer.on('app:close-request', callback),
  onLockRequired: (callback) => ipcRenderer.on('app:lock-required', callback),
  onSyncStatus: (callback) => ipcRenderer.on('sync:status', (_, status) => callback(status)),

  loadLanguage: (lang) => ipcRenderer.invoke('i18n:load', lang),

  syncTest: (url, username, password) => ipcRenderer.invoke('sync:test', url, username, password),
  syncPush: () => ipcRenderer.invoke('sync:push'),
  syncPull: () => ipcRenderer.invoke('sync:pull'),
  syncConfig: (config) => ipcRenderer.invoke('sync:config', config),
  syncGetConfig: () => ipcRenderer.invoke('sync:get-config'),
  syncCheckUpdate: () => ipcRenderer.invoke('sync:check-update'),
  syncCompare: () => ipcRenderer.invoke('sync:compare'),
  syncResolveUpload: () => ipcRenderer.invoke('sync:resolve-upload'),
  syncResolveDownload: () => ipcRenderer.invoke('sync:resolve-download')
});
