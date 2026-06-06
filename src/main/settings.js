const electron = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  language: 'zh-CN',
  theme: 'dark',
  autoLockMinutes: 30,
  loginAttemptLimit: 5,
  passwordRevealSeconds: 3,
  clipboardClearMinutes: 1,
  logEnabled: false,
  storagePath: '',
  syncMode: 'none',
  webdav: { url: '', username: '', encryptedPassword: '' },
  folderSync: { path: '' },
  keyboardShortcuts: {
    search: 'Ctrl+F',
    newEntry: 'Ctrl+N',
    deleteEntry: '',
    lock: '',
    quit: ''
  },
  columnWidths: {},
  closeBehavior: 'ask',
  windowBounds: { width: 900, height: 620 }
};

const settingsPath = path.join(electron.app.getPath('userData'), 'settings.json');

let settings = null;

function load() {
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      settings = { ...DEFAULTS, ...JSON.parse(raw) };
    } else {
      settings = { ...DEFAULTS };
      save();
    }
  } catch (e) {
    settings = { ...DEFAULTS };
  }
  return settings;
}

function save() {
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}

function get(key) {
  if (!settings) load();
  return key ? settings[key] : settings;
}

function set(key, value) {
  if (!settings) load();
  settings[key] = value;
  save();
}

function getAll() {
  if (!settings) load();
  return { ...settings };
}

function reset() {
  settings = { ...DEFAULTS };
  try { fs.unlinkSync(settingsPath); } catch (e) {}
}

module.exports = { load, save, get, set, getAll, reset, DEFAULTS, settingsPath };
