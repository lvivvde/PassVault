const fs = require('fs');
const path = require('path');
const electron = require('electron');

const LOG_DIR = path.join(electron.app.getPath('userData'), 'logs');

let enabled = false;

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function todayFile() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return path.join(LOG_DIR, `${yyyy}-${mm}-${dd}.log`);
}

function timestamp() {
  return new Date().toISOString();
}

function write(level, source, message, data) {
  if (!enabled) return;
  try {
    ensureDir();
    const line = `[${timestamp()}] [${level}] [${source}] ${message}`;
    const extra = data ? ' | ' + JSON.stringify(data) : '';
    fs.appendFileSync(todayFile(), line + extra + '\n', 'utf8');
  } catch (e) {
  }
}

const logger = {
  setEnabled(val) { enabled = val; },

  info(source, message, data) { write('INFO', source, message, data); },
  warn(source, message, data) { write('WARN', source, message, data); },
  error(source, message, data) { write('ERROR', source, message, data); },
  debug(source, message, data) { write('DEBUG', source, message, data); },

  vault(method, detail) { write('VAULT', method, detail); },
  crypto(method, detail) { write('CRYPTO', method, detail); },
  sync(method, detail) { write('SYNC', method, detail); },
  lock(method, detail) { write('LOCK', method, detail); },
  ipc(channel, detail) { write('IPC', channel, detail); }
};

module.exports = logger;
