async function initSettingsPage() {
  document.getElementById('settings-back-btn').addEventListener('click', () => {
    showPage('main');
  });

  const sett = await window.api.getSettings();
  document.getElementById('setting-language').value = sett.language || 'zh-CN';
  document.getElementById('setting-theme').value = sett.theme || 'dark';
  document.getElementById('setting-auto-lock').value = sett.autoLockMinutes || 30;
  document.getElementById('setting-login-limit').value = sett.loginAttemptLimit || 5;
  document.getElementById('setting-reveal-duration').value = sett.passwordRevealSeconds || 3;
  document.getElementById('setting-clipboard').value = sett.clipboardClearMinutes || 1;
  document.getElementById('setting-sync-mode').value = sett.syncMode || 'none';
  document.getElementById('setting-storage-path').textContent = sett.storagePath || 'Not set';

  if (state.recoveryKeyHint) {
    document.getElementById('setting-key-hint').textContent = state.recoveryKeyHint;
  }

  ['language', 'theme', 'auto-lock', 'login-limit', 'reveal-duration', 'clipboard'].forEach(id => {
    document.getElementById('setting-' + id).addEventListener('change', async (e) => {
      const keyMap = {
        language: 'language', theme: 'theme', 'auto-lock': 'autoLockMinutes',
        'login-limit': 'loginAttemptLimit', 'reveal-duration': 'passwordRevealSeconds',
        clipboard: 'clipboardClearMinutes'
      };
      await window.api.setSetting(keyMap[id], parseInt(e.target.value) || e.target.value);
      if (id === 'theme') {
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add('theme-' + e.target.value);
      }
      if (id === 'language') setLanguage(e.target.value);
    });
  });

  document.getElementById('setting-sync-mode').addEventListener('change', (e) => {
    const v = e.target.value;
    document.getElementById('sync-webdav-config').style.display = v === 'webdav' ? 'block' : 'none';
    document.getElementById('sync-folder-config').style.display = v === 'folder' ? 'block' : 'none';
    window.api.setSetting('syncMode', v);
  });

  document.getElementById('setting-change-password').addEventListener('click', showChangePassword);
  document.getElementById('setting-regenerate-key').addEventListener('click', showRegenerateKey);
  document.getElementById('setting-change-path').addEventListener('click', showChangePath);
  document.getElementById('clear-trash-btn').addEventListener('click', clearTrash);
  document.getElementById('add-vault-btn').addEventListener('click', showAddVault);

  document.getElementById('setting-log').checked = sett.logEnabled || false;
  document.getElementById('setting-log').addEventListener('change', async (e) => {
    await window.api.toggleLog(e.target.checked);
    showToast(e.target.checked ? 'Logging enabled' : 'Logging disabled');
  });
  document.getElementById('export-plain-btn').addEventListener('click', exportPlain);
  document.getElementById('export-encrypted-btn').addEventListener('click', exportEncrypted);
  document.getElementById('import-btn').addEventListener('click', importFile);

  renderVaultList();
  renderTrash();
}

function renderVaultList() {
  const list = document.getElementById('vault-list');
  list.innerHTML = '';
  state.vaults.forEach(v => {
    const div = document.createElement('div');
    div.className = 'vault-item';
    div.innerHTML = `
      <span class="vault-drag">≡</span>
      <span class="vault-name">${v.name}</span>
      <div class="vault-actions">
        <button class="btn btn-small rename-vault-btn" data-id="${v.id}">Rename</button>
        ${state.vaults.length > 1 ? `<button class="btn btn-small delete-vault-btn" data-id="${v.id}">Delete</button>` : ''}
      </div>`;
    list.appendChild(div);
    div.querySelector('.delete-vault-btn')?.addEventListener('click', () => showDeleteVault(v.id));
    div.querySelector('.rename-vault-btn').addEventListener('click', () => {
      const name = prompt('New name:', v.name);
      if (name) window.api.renameVault(v.id, name).then(() => {
        window.api.getState().then(s => { state = s; renderVaultList(); });
      });
    });
  });
}

function showDeleteVault(vaultId) {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small">
      <h3>Delete Vault</h3>
      <p>What to do with entries in this vault?</p>
      <button class="btn btn-danger" id="vault-del-entries">Delete all entries</button>
      <button class="btn" id="vault-move-entries">Move to first vault</button>
      <button class="btn" id="vault-del-cancel">Cancel</button>
    </div>`;
  document.getElementById('vault-del-entries').addEventListener('click', async () => {
    overlay.style.display = 'none';
    await window.api.deleteVault(vaultId, 'delete');
    state = await window.api.getState();
    renderVaultList();
  });
  document.getElementById('vault-move-entries').addEventListener('click', async () => {
    overlay.style.display = 'none';
    await window.api.deleteVault(vaultId, 'move');
    state = await window.api.getState();
    renderVaultList();
  });
  document.getElementById('vault-del-cancel').addEventListener('click', () => overlay.style.display = 'none');
}

function showAddVault() {
  const name = prompt('Vault name:');
  if (name) {
    window.api.addVault(name).then(() => {
      window.api.getState().then(s => { state = s; renderVaultList(); });
    });
  }
}

function renderTrash() {
  const list = document.getElementById('trash-list');
  if (!state.trash || !state.trash.length) {
    list.innerHTML = '<p class="trash-empty">' + t('trash.empty') + '</p>';
    return;
  }
  list.innerHTML = state.trash.map(t => `
    <div class="trash-item">
      <span class="trash-info">${t.entry.website} - ${t.entry.account}</span>
      <span class="trash-time">${new Date(t.deletedAt).toLocaleString()}</span>
      <button class="btn btn-small restore-trash-btn" data-id="${t.entry.id}">Restore</button>
      <button class="btn btn-small btn-danger perm-delete-btn" data-id="${t.entry.id}">Permanent</button>
    </div>`).join('');

  list.querySelectorAll('.restore-trash-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await window.api.restoreEntry(parseInt(btn.getAttribute('data-id')));
      state = await window.api.getState();
      renderTrash();
      showToast(t('trash.restored'));
    });
  });
}

async function clearTrash() {
  await window.api.clearTrash();
  state = await window.api.getState();
  renderTrash();
  showToast(t('trash.cleared'));
}

function showChangePassword() {
  const oldPw = prompt('Current master password:');
  if (!oldPw) return;
  const newPw = prompt('New master password (≥4 chars):');
  if (!newPw || newPw.length < 4) { showToast('Password must be at least 4 characters'); return; }
  window.api.changeMasterPassword(oldPw, newPw).then(result => {
    showToast(result.success ? 'Master password changed' : 'Wrong current password');
  });
}

function showRegenerateKey() {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small">
      <h3>Regenerate Recovery Key</h3>
      <p>This will generate a new key. The old key will no longer work.</p>
      <input type="password" id="regenerate-pw" class="input" placeholder="Confirm master password" style="margin:8px 0;">
      <button class="btn btn-primary" id="do-regenerate">Regenerate</button>
      <button class="btn" id="regenerate-cancel">Cancel</button>
    </div>`;
  document.getElementById('do-regenerate').addEventListener('click', async () => {
    const pw = document.getElementById('regenerate-pw').value;
    overlay.style.display = 'none';
    const result = await window.api.regenerateKey(pw);
    if (result.success) {
      const overlay2 = document.getElementById('delete-confirm-overlay');
      overlay2.style.display = 'flex';
      overlay2.innerHTML = `
        <div class="modal modal-small">
          <h3>New Recovery Key (shown once)</h3>
          <div class="key-box"><code>${result.recoveryKey}</code></div>
          <button class="btn btn-primary" id="new-key-close">I have saved it</button>
        </div>`;
      document.getElementById('new-key-close').addEventListener('click', () => overlay2.style.display = 'none');
      state = await window.api.getState();
      document.getElementById('setting-key-hint').textContent = state.recoveryKeyHint;
    } else {
      showToast('Wrong password');
    }
  });
  document.getElementById('regenerate-cancel').addEventListener('click', () => overlay.style.display = 'none');
}

async function showChangePath() {
  const folder = await window.api.pickFolder();
  if (folder) {
    const path = folder + '\\vault.pvault';
    await window.api.setSetting('storagePath', path);
    document.getElementById('setting-storage-path').textContent = path;
    await window.api.save();
  }
}

async function exportPlain() {
  const path = await window.api.saveFile([{ name: 'JSON Files', extensions: ['json'] }]);
  if (path) {
    await window.api.exportPlain(path);
    showToast('Exported successfully');
  }
}

async function exportEncrypted() {
  const path = await window.api.saveFile([{ name: 'PassVault Files', extensions: ['pvault'] }]);
  if (path) {
    await window.api.exportEncrypted(path);
    showToast('Exported successfully');
  }
}

async function importFile() {
  const path = await window.api.pickFile([
    { name: 'PassVault Files', extensions: ['json', 'pvault'] }
  ]);
  if (!path) return;

  const isJson = path.endsWith('.json');
  const type = isJson ? 'plain' : 'encrypted';

  let password = null;
  if (type === 'encrypted') {
    password = prompt('Enter master password for this vault:');
    if (!password) return;
  }

  const result = await window.api.importFile(path, type, password);
  if (!result.success) { showToast('Import failed: ' + result.error); return; }

  if (type === 'plain') {
  } else {

  }

  state = await window.api.getState();
  const q = document.getElementById('main-search')?.value || '';
  showToast('Import completed');
}
