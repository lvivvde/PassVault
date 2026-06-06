let mainState = null;
let searchFields = { website: true, alias: true, account: true, password: false, visible: false };
let activeVaultFilter = null;

async function initMainPage() {
  mainState = state;
  activeVaultFilter = null;
  renderTable(mainState.vaults, mainState.entries, '', searchFields, false, activeVaultFilter);

  document.getElementById('main-search').addEventListener('input', (e) => {
    const global = document.getElementById('search-global').checked;
    renderTable(mainState.vaults, mainState.entries, e.target.value, searchFields, global, activeVaultFilter);
  });

  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.getAttribute('data-field');
      if (field === 'password') {
        const wasActive = btn.classList.contains('active');
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        if (!wasActive) {
          btn.classList.add('active');
          searchFields = { website: false, alias: false, account: false, password: true, visible: true };
        } else {
          searchFields = { website: true, alias: true, account: true, password: false, visible: true };
          document.querySelectorAll('.toggle-btn[data-field="website"], .toggle-btn[data-field="alias"], .toggle-btn[data-field="account"]').forEach(b => b.classList.add('active'));
        }
      } else {
        btn.classList.toggle('active');
        searchFields[field] = btn.classList.contains('active');
        if (searchFields.password) {
          searchFields.password = false;
          document.querySelector('.toggle-btn[data-field="password"]').classList.remove('active');
        }
      }
      const q = document.getElementById('main-search').value;
      const global = document.getElementById('search-global').checked;
      renderTable(mainState.vaults, mainState.entries, q, searchFields, global, activeVaultFilter);
    });
  });

  document.getElementById('search-global').addEventListener('change', () => {
    const q = document.getElementById('main-search').value;
    const global = document.getElementById('search-global').checked;
    renderTable(mainState.vaults, mainState.entries, q, searchFields, global, activeVaultFilter);
  });

  document.getElementById('main-add-btn').addEventListener('click', () => showEditModal());
  document.getElementById('main-lock-btn').addEventListener('click', async () => {
    await window.api.lock();
    showPage('lock');
    initLockScreen();
  });
  document.getElementById('main-settings-btn').addEventListener('click', () => {
    showPage('settings');
    initSettingsPage();
  });

  renderMainSidebar();

  // sync button and status
  const syncIcon = document.getElementById('sync-status-icon');
  initSyncStatus();

  document.getElementById('main-sync-btn').addEventListener('click', async () => {
    const icon = document.getElementById('sync-status-icon');
    icon.textContent = '⟳';
    icon.className = 'sync-status-icon';
    const cfg = await window.api.syncGetConfig();
    if (!cfg || cfg.mode === 'none') {
      icon.className = 'sync-status-icon unsaved';
      icon.textContent = '✕';
      showToast('请先在设置中配置同步');
      return;
    }
    const result = await window.api.syncPush();
    if (result.success) {
      setSyncTime();
      icon.className = 'sync-status-icon synced';
      icon.textContent = '●';
      showToast(t('sync.pushOk'));
    } else {
      icon.className = 'sync-status-icon unsaved';
      icon.textContent = '✕';
      showToast('上传失败: ' + (result.message || ''));
    }
  });

  window.api.onSyncStatus((status) => {
    if (status.type === 'synced') {
      syncIcon.className = 'sync-status-icon synced';
      syncIcon.textContent = '●';
      setSyncTime();
    } else if (status.type === 'unsaved') {
      syncIcon.className = 'sync-status-icon unsaved';
      syncIcon.textContent = '✕';
    }
  });

  document.getElementById('modal-close').addEventListener('click', closeEditModal);
  document.getElementById('modal-cancel').addEventListener('click', closeEditModal);
  document.getElementById('modal-save').addEventListener('click', saveEditModal);
  document.getElementById('modal-delete').addEventListener('click', confirmDeleteEntry);

  document.getElementById('main-table').addEventListener('click', (e) => {
    const row = e.target.closest('.table-row');
    const gear = e.target.closest('.col-drag');
    if (gear) return;
    if (row && !e.target.closest('button') && !e.target.closest('.col-password')) {
      const id = parseInt(row.getAttribute('data-id'));
      if (id) showEditModal(id);
    }
  });

  window.api.onLockRequired(() => {
    showPage('lock');
    initLockScreen();
  });

  // startup cloud sync check (delay to let UI render)
  setTimeout(checkCloudUpdate, 1500);

  // drag-and-drop reorder
  const tableWrap = document.getElementById('main-table-wrap');
  let dragId = null;

  tableWrap.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.table-row');
    if (!row) return;
    dragId = parseInt(row.dataset.id);
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  tableWrap.addEventListener('dragend', (e) => {
    const row = e.target.closest('.table-row');
    if (row) row.classList.remove('dragging');
    dragId = null;
    document.querySelectorAll('.table-row').forEach(r => r.classList.remove('drag-over'));
  });

  tableWrap.addEventListener('dragover', (e) => {
    e.preventDefault();
    const row = e.target.closest('.table-row');
    if (!row || !dragId || parseInt(row.dataset.id) === dragId) return;
    document.querySelectorAll('.table-row').forEach(r => r.classList.remove('drag-over'));
    row.classList.add('drag-over');
  });

  tableWrap.addEventListener('drop', async (e) => {
    e.preventDefault();
    const targetRow = e.target.closest('.table-row');
    if (!targetRow || !dragId) return;
    const targetId = parseInt(targetRow.dataset.id);
    if (targetId === dragId) return;

    // swap order
    const dragEntry = mainState.entries.find(en => en.id === dragId);
    const targetEntry = mainState.entries.find(en => en.id === targetId);
    if (dragEntry && targetEntry) {
      const tmp = dragEntry.order;
      dragEntry.order = targetEntry.order;
      targetEntry.order = tmp;
      await window.api.reorderEntries(
        mainState.entries.reduce((m, e) => { m[e.id] = e.order; return m; }, {})
      );
      mainState = await window.api.getState();
      state = mainState;
      // reset column sort so drag order takes effect
      sortField = null;
      const q = document.getElementById('main-search').value;
      const global = document.getElementById('search-global').checked;
      renderTable(mainState.vaults, mainState.entries, q, searchFields, global, activeVaultFilter);
      renderMainSidebar();
      showToast(t('settings.sortToast'));
    }
    dragId = null;
  });
}

function renderMainSidebar() {
  const list = document.getElementById('main-vault-list');
  const vaults = mainState.vaults || [];
  const entries = mainState.entries || [];

  list.innerHTML = '<div class="main-vault-item active" data-vault-id="all"><span class="vault-dot" style="background:var(--text-muted);"></span><span class="vault-name">全部</span><span class="vault-count-badge">' + entries.length + '</span></div>' +
    vaults.map(v => {
      const count = entries.filter(e => e.vaultIds && e.vaultIds.includes(v.id)).length;
      return `
        <div class="main-vault-item" data-vault-id="${v.id}">
          <span class="vault-dot"></span>
          <span class="vault-name">${escHtml(v.name)}</span>
          <span class="vault-count-badge">${count}</span>
        </div>`;
    }).join('');

  list.querySelectorAll('.main-vault-item').forEach(item => {
    item.addEventListener('click', () => {
      list.querySelectorAll('.main-vault-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const vaultId = item.dataset.vaultId;
      activeVaultFilter = vaultId === 'all' ? null : parseInt(vaultId);
      const q = document.getElementById('main-search').value;
      const global = document.getElementById('search-global').checked;
      renderTable(mainState.vaults, mainState.entries, q, searchFields, global, activeVaultFilter);
    });
  });
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function initSyncStatus() {
  const cfg = await window.api.syncGetConfig();
  const icon = document.getElementById('sync-status-icon');
  if (!cfg || cfg.mode === 'none') {
    icon.textContent = '○';
    icon.className = 'sync-status-icon';
    updateSyncTimeDisplay();
    return;
  }
  // configured but unknown sync state → unsaved until proven otherwise
  icon.className = 'sync-status-icon unsaved';
  icon.textContent = '✕';
  updateSyncTimeDisplay();
}

function setSyncTime() {
  const now = Date.now();
  localStorage.setItem('passvault_lastSync', now);
  updateSyncTimeDisplay();
}

function updateSyncTimeDisplay() {
  const el = document.getElementById('sync-time');
  if (!el) return;
  const ts = localStorage.getItem('passvault_lastSync');
  if (!ts) { el.textContent = ''; return; }
  const diff = Date.now() - parseInt(ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) { el.textContent = '刚刚'; return; }
  if (mins < 60) { el.textContent = mins + ' 分钟前'; return; }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) { el.textContent = hrs + ' 小时前'; return; }
  const days = Math.floor(hrs / 24);
  el.textContent = days + ' 天前';
}

async function checkCloudUpdate() {
  const result = await window.api.syncCheckUpdate();
  if (!result.hasUpdate) return;

  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small">
      <h3>云端有更新</h3>
      <p style="font-size:12px;color:var(--text-secondary);margin:8px 0;">
        云端 v${result.remoteVersion} &gt; 本地 v${result.localVersion}
      </p>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
        <button class="btn" id="cloud-skip">跳过</button>
        <button class="btn btn-primary" id="cloud-download">下载更新</button>
      </div>
    </div>`;

  document.getElementById('cloud-skip').addEventListener('click', () => overlay.style.display = 'none');
  document.getElementById('cloud-download').addEventListener('click', async () => {
    overlay.style.display = 'none';
    const pull = await window.api.syncPull();
    if (pull.success) {
      showToast('已下载云端 v' + result.remoteVersion);
      state = mainState = await window.api.reloadState();
      document.getElementById('sync-status-icon').className = 'sync-status-icon synced';
      document.getElementById('sync-status-icon').textContent = '●';
      setSyncTime();
      const q = document.getElementById('main-search').value;
      const global = document.getElementById('search-global').checked;
      renderTable(mainState.vaults, mainState.entries, q, searchFields, global, activeVaultFilter);
      renderMainSidebar();
    } else {
      showToast('下载失败: ' + (pull.message || ''));
    }
  });
}

async function showSyncDiffDialog(cmp) {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';

  let title, body, buttons;

  if (cmp.action === 'upload' && cmp.safeAuto) {
    // Safe auto-upload
    overlay.innerHTML = `
      <div class="modal modal-small">
        <h3>云端同步</h3>
        <p style="font-size:12px;color:var(--text-secondary);margin:8px 0;">${t(cmp.reasonKey) || cmp.reason}，正在上传本地 v${cmp.localVersion || '?'}...</p>
      </div>`;
    const r = await window.api.syncResolveUpload();
    overlay.style.display = 'none';
    if (r.success) {
      document.getElementById('sync-status-icon').className = 'sync-status-icon synced';
      document.getElementById('sync-status-icon').textContent = '●';
      showToast(t('sync.pushOk'));
    } else {
      showToast('同步失败: ' + (r.message || ''));
    }
    return;
  }

  if (cmp.action === 'download' && cmp.safeAuto) {
    overlay.innerHTML = `
      <div class="modal modal-small">
        <h3>云端同步</h3>
        <p style="font-size:12px;color:var(--text-secondary);margin:8px 0;">${t(cmp.reasonKey) || cmp.reason}，正在下载云端 v${cmp.remoteVersion || '?'}...</p>
      </div>`;
    const r = await window.api.syncResolveDownload();
    overlay.style.display = 'none';
    if (r.success) {
      showToast(t('sync.pullOk'));
      await refreshAfterSync();
    } else {
      showToast('下载失败: ' + (r.message || ''));
    }
    return;
  }

  if (cmp.action === 'none') {
    document.getElementById('sync-status-icon').className = 'sync-status-icon synced';
    document.getElementById('sync-status-icon').textContent = '●';
    showToast(t(cmp.reasonKey) || cmp.reason || t('sync.sameContent'));
    return;
  }

  // Conflict scenarios
  if (cmp.type === 'key_mismatch') {
    title = '密钥不匹配';
    body = '当前密钥可以打开本地密码库，但无法打开云端同步文件。\n可能原因：云端使用了不同的密钥、属于另一个密码库、或文件已损坏。';
    buttons = `
      <button class="btn" id="sync-push-local">⬆ 使用本地数据覆盖云端</button>
      <button class="btn btn-small" id="sync-cancel">取消同步</button>`;
  } else if (cmp.type === 'different_vault') {
    title = '密码库不匹配';
    body = t('sync.differentVault');
    buttons = `
      <button class="btn" id="sync-push-local">⬆ 使用本地覆盖云端</button>
      <button class="btn" id="sync-pull-remote">⬇ 备份本地后用云端覆盖</button>
      <button class="btn btn-small" id="sync-cancel">取消</button>`;
  } else if (cmp.type === 'mass_delete') {
    title = t('sync.massDelete');
    body = `云端 ${cmp.remoteCount} 条，本地 ${cmp.localCount} 条（减少 ${cmp.deleted} 条）。为避免误删同步到云端，请确认。`;
    buttons = `
      <button class="btn btn-danger" id="sync-push-local">确认删除，覆盖云端</button>
      <button class="btn" id="sync-pull-remote">从云端恢复数据</button>
      <button class="btn btn-small" id="sync-cancel">取消</button>`;
  } else {
    title = '本地与云端数据不一致';
    body = `本地版本 ${cmp.localVersion || '?'}，云端版本 ${cmp.remoteVersion || '?'}<br><span style="font-size:11px;color:var(--text-muted)">${cmp.type === 'both_modified' ? t('sync.bothModified') : cmp.type === 'hash_mismatch' ? t('sync.hashMismatch') : (t(cmp.reasonKey) || cmp.reason)}</span>`;
    buttons = `
      <button class="btn" id="sync-push-local">⬆ 以本地为准覆盖云端</button>
      <button class="btn" id="sync-pull-remote">⬇ 以云端为准覆盖本地</button>
      <button class="btn btn-small" id="sync-cancel">取消</button>`;
  }

  overlay.innerHTML = `
    <div class="modal" style="max-width:480px;">
      <h3>${title}</h3>
      <p style="font-size:12px;color:var(--text-secondary);margin:8px 0;">${body}</p>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;">${buttons}</div>
    </div>`;

  document.getElementById('sync-cancel').addEventListener('click', () => overlay.style.display = 'none');

  const pushBtn = document.getElementById('sync-push-local');
  const pullBtn = document.getElementById('sync-pull-remote');

  if (pushBtn) pushBtn.addEventListener('click', async () => {
    overlay.style.display = 'none';
    const r = await window.api.syncResolveUpload();
    if (r.success) {
      document.getElementById('sync-status-icon').className = 'sync-status-icon synced';
      document.getElementById('sync-status-icon').textContent = '●';
      showToast(t('sync.uploadLabel'));
    } else { showToast('上传失败: ' + (r.message || '')); }
  });

  if (pullBtn) pullBtn.addEventListener('click', async () => {
    overlay.style.display = 'none';
    const r = await window.api.syncResolveDownload();
    if (r.success) {
      showToast(t('sync.pullLabel'));
      await refreshAfterSync();
    } else { showToast('下载失败: ' + (r.message || '')); }
  });
}

function markUnsaved() {
  const icon = document.getElementById('sync-status-icon');
  if (icon.textContent !== '○') {
    icon.className = 'sync-status-icon unsaved';
    icon.textContent = '✕';
  }
}

let editingId = null;
let editingOriginal = {}; // original values to detect changes

async function refreshAfterSync() {
  state = mainState = await window.api.reloadState();
  document.getElementById('sync-status-icon').className = 'sync-status-icon synced';
  document.getElementById('sync-status-icon').textContent = '●';
  setSyncTime();
  const q = document.getElementById('main-search').value;
  const global = document.getElementById('search-global').checked;
  renderTable(mainState.vaults, mainState.entries, q, searchFields, global, activeVaultFilter);
  renderMainSidebar();
}

async function showEditModal(id = null) {
  editingId = id;
  editingOriginal = {};
  const overlay = document.getElementById('modal-overlay');
  overlay.style.display = 'flex';

  // click outside to close
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      const changed = document.getElementById('edit-website').value !== editingOriginal.website
        || document.getElementById('edit-alias').value !== editingOriginal.alias
        || document.getElementById('edit-account').value !== editingOriginal.account
        || document.getElementById('edit-password').value !== editingOriginal.password
        || document.getElementById('edit-description').value !== editingOriginal.description
        || document.getElementById('edit-visible').checked !== editingOriginal.visible;
      if (!changed) { closeEditModal(); return; }
      // custom confirm
      const confirmOverlay = document.getElementById('delete-confirm-overlay');
      confirmOverlay.style.display = 'flex';
      confirmOverlay.innerHTML = `
        <div class="modal modal-small">
          <h3>未保存的内容</h3><p style="font-size:12px;color:var(--text-secondary);margin:8px 0">有未保存的内容，确定关闭吗？</p>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
            <button class="btn" id="unsaved-cancel">取消</button>
            <button class="btn btn-danger" id="unsaved-close">关闭</button>
          </div>
        </div>`;
      document.getElementById('unsaved-cancel').addEventListener('click', () => confirmOverlay.style.display = 'none');
      document.getElementById('unsaved-close').addEventListener('click', () => { confirmOverlay.style.display = 'none'; closeEditModal(); });
    }
  };

  const menu = document.getElementById('vault-dropdown-menu');
  const label = document.getElementById('vault-dropdown-label');
  const btn = document.getElementById('vault-dropdown-btn');

  // Default: only check "默认" vault (id=1) for new entries
  let defaultVaultId = mainState.vaults.length ? mainState.vaults[0].id : null;
  menu.innerHTML = mainState.vaults.map(v => `
    <label class="vault-dropdown-item">
      <input type="checkbox" value="${v.id}" ${!editingId && v.id === defaultVaultId ? 'checked' : ''}>
      <span>${escHtml(v.name)}</span>
    </label>`).join('');

  // close dropdown when clicking outside
  btn.onclick = (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  };
  overlay.addEventListener('click', (e) => {
    if (!e.target.closest('.vault-dropdown')) menu.style.display = 'none';
  });

  // update label & validate
  function updateVaultLabel() {
    const checked = menu.querySelectorAll('input:checked');
    if (!checked.length) {
      label.textContent = t('edit.selectVault');
      label.style.color = 'var(--danger)';
    } else if (checked.length === mainState.vaults.length) {
      label.textContent = t('edit.allVaults');
      label.style.color = '';
    } else if (checked.length === 1) {
      label.textContent = checked[0].nextElementSibling.textContent;
      label.style.color = '';
    } else {
      label.textContent = `已选 ${checked.length} 个`;
      label.style.color = '';
    }
  }

  menu.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', updateVaultLabel);
  });
  updateVaultLabel();

  if (id) {
    const entry = mainState.entries.find(e => e.id === id);
    if (entry) {
      document.getElementById('edit-website').value = entry.website;
      document.getElementById('edit-alias').value = entry.alias;
      document.getElementById('edit-account').value = entry.account;
      document.getElementById('edit-password').value = entry.password;
      document.getElementById('edit-description').value = entry.description || '';
      document.getElementById('edit-visible').checked = entry.visible;
      menu.querySelectorAll('input').forEach(cb => {
        cb.checked = entry.vaultIds.includes(parseInt(cb.value));
      });
      updateVaultLabel();
    }
  } else {
    document.getElementById('edit-website').value = '';
    document.getElementById('edit-alias').value = '';
    document.getElementById('edit-account').value = '';
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-description').value = '';
    document.getElementById('edit-visible').checked = true;
  }

  // save original values to detect changes
  editingOriginal = {
    website: document.getElementById('edit-website').value,
    alias: document.getElementById('edit-alias').value,
    account: document.getElementById('edit-account').value,
    password: document.getElementById('edit-password').value,
    description: document.getElementById('edit-description').value,
    visible: document.getElementById('edit-visible').checked
  };

  // paste buttons
  document.querySelectorAll('.paste-btn').forEach(btn => {
    btn.onclick = async () => {
      const text = await window.api.readClipboard();
      if (text) {
        const target = document.getElementById(btn.dataset.target);
        if (target) { target.value = text; target.focus(); }
      }
    };
  });

  // copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.onclick = async () => {
      const target = document.getElementById(btn.dataset.target);
      if (target && target.value) {
        await window.api.copyToClipboard(target.value, 1);
        showToast(t('main.copyToast'));
      }
    };
  });

  document.querySelector('.toggle-password-btn').onclick = () => {
    const pw = document.getElementById('edit-password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  };

  // password generator
  document.getElementById('generate-pw-btn').onclick = () => showPasswordGenerator();
}

function closeEditModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  editingId = null;
}

async function saveEditModal() {
  const entry = {
    id: editingId,
    website: document.getElementById('edit-website').value,
    alias: document.getElementById('edit-alias').value,
    account: document.getElementById('edit-account').value,
    password: document.getElementById('edit-password').value,
    description: document.getElementById('edit-description').value,
    vaultIds: Array.from(document.querySelectorAll('#vault-dropdown-menu input:checked')).map(cb => parseInt(cb.value)),
    visible: document.getElementById('edit-visible').checked
  };

  if (!entry.website || !entry.account || !entry.password) {
    showToast(t('edit.required'));
    return;
  }
  if (!entry.vaultIds.length) { showToast(t('edit.vaultRequired')); return; }

  if (editingId) {
    await window.api.updateEntry(entry);
  } else {
    const result = await window.api.addEntry(entry);
    if (result.success) {
      showToast(`已在 ${result.entries.length} 个密码库中各创建一条记录`);
    }
  }

  closeEditModal();
  mainState = await window.api.getState();
  state = mainState; // sync global state for settings/trash
  const q = document.getElementById('main-search').value;
  const global = document.getElementById('search-global').checked;
  renderTable(mainState.vaults, mainState.entries, q, searchFields, global, activeVaultFilter);
  renderMainSidebar();
  showToast(t('main.savedToast'));
  markUnsaved();
}

function confirmDeleteEntry() {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small">
      <h3>Confirm Delete</h3>
      <p>Move this entry to trash? You can restore it later.</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
        <button class="btn" onclick="document.getElementById('delete-confirm-overlay').style.display='none'">Cancel</button>
        <button class="btn btn-danger" id="do-delete-btn">Delete</button>
      </div>
    </div>`;
  document.getElementById('do-delete-btn').addEventListener('click', async () => {
    overlay.style.display = 'none';
    await window.api.deleteEntry(editingId);
    closeEditModal();
    mainState = await window.api.getState();
    state = mainState; // sync global state for settings/trash
    const q = document.getElementById('main-search').value;
    const global = document.getElementById('search-global').checked;
    renderTable(mainState.vaults, mainState.entries, q, searchFields, global, activeVaultFilter);
    renderMainSidebar();
    showToast(t('main.deletedToast'));
    markUnsaved();
  });
}

// ─── Password Generator ────────────────────────────────────

function showPasswordGenerator() {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';

  function generate() {
    const len = parseInt(document.getElementById('gen-length').value);
    const upper = document.getElementById('gen-upper').checked;
    const lower = document.getElementById('gen-lower').checked;
    const digits = document.getElementById('gen-digits').checked;
    const symbols = document.getElementById('gen-symbols').checked;

    let chars = '';
    if (upper) chars += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (lower) chars += 'abcdefghjkmnpqrstuvwxyz';
    if (digits) chars += '23456789';
    if (symbols) chars += '!@#$%^&*-_+=';
    if (!chars) chars = 'abcdefghjkmnpqrstuvwxyz';

    let pw = '';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    for (let i = 0; i < len; i++) pw += chars[arr[i] % chars.length];
    return pw;
  }

  function render() {
    document.getElementById('gen-result').textContent = generate();
  }

  overlay.innerHTML = `
    <div class="modal modal-small">
      <h3>密码生成器</h3>
      <div class="gen-row"><label>长度:</label><input type="range" id="gen-length" min="8" max="32" value="16" style="flex:1"><span id="gen-length-val">16</span></div>
      <div class="gen-checks">
        <label><input type="checkbox" id="gen-upper" checked> 大写</label>
        <label><input type="checkbox" id="gen-lower" checked> 小写</label>
        <label><input type="checkbox" id="gen-digits" checked> 数字</label>
        <label><input type="checkbox" id="gen-symbols" checked> 符号</label>
      </div>
      <div class="gen-result" id="gen-result"></div>
      <button class="btn btn-small" id="gen-refresh" style="width:100%;margin-top:4px;">🔄 重新生成</button>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn" id="gen-cancel">取消</button>
        <button class="btn btn-primary" id="gen-confirm">使用</button>
      </div>
    </div>`;

  document.getElementById('gen-length').addEventListener('input', (e) => {
    document.getElementById('gen-length-val').textContent = e.target.value;
    render();
  });
  document.querySelectorAll('#gen-upper, #gen-lower, #gen-digits, #gen-symbols').forEach(cb => {
    cb.addEventListener('change', render);
  });
  document.getElementById('gen-refresh').addEventListener('click', render);
  document.getElementById('gen-cancel').addEventListener('click', () => overlay.style.display = 'none');
  document.getElementById('gen-confirm').addEventListener('click', () => {
    document.getElementById('edit-password').value = document.getElementById('gen-result').textContent;
    overlay.style.display = 'none';
    showToast(t('gen.generated'));
  });
  render();
}
