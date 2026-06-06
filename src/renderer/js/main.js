let mainState = null;
let searchFields = { website: true, alias: true, account: true, password: false, visible: true };
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
    syncIcon.textContent = '⟳';
    try {
      const result = await window.api.syncPush();
      if (result.success) {
        syncIcon.className = 'sync-status-icon synced';
        syncIcon.textContent = '●';
      } else {
        syncIcon.className = 'sync-status-icon unsaved';
        syncIcon.textContent = '✕';
        showToast('同步失败: ' + (result.message || ''));
      }
    } catch (e) {
      syncIcon.className = 'sync-status-icon unsaved';
      syncIcon.textContent = '✕';
    }
  });

  window.api.onSyncStatus((status) => {
    if (status.type === 'synced') {
      syncIcon.className = 'sync-status-icon synced';
      syncIcon.textContent = '●';
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
      const q = document.getElementById('main-search').value;
      const global = document.getElementById('search-global').checked;
      renderTable(mainState.vaults, mainState.entries, q, searchFields, global, activeVaultFilter);
      renderMainSidebar();
      showToast('排序已更新');
    }
    dragId = null;
  });
}

function renderMainSidebar() {
  const list = document.getElementById('main-vault-list');
  const vaults = mainState.vaults || [];
  const entries = mainState.entries || [];

  list.innerHTML = '<div class="main-vault-item active" data-vault-id="all"><span class="vault-dot" style="background:var(--text-muted);"></span><span>全部</span><span class="vault-count-badge">' + entries.length + '</span></div>' +
    vaults.map(v => {
      const count = entries.filter(e => e.vaultIds && e.vaultIds.includes(v.id)).length;
      return `
        <div class="main-vault-item" data-vault-id="${v.id}">
          <span class="vault-dot"></span>
          <span>${escHtml(v.name)}</span>
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
    return;
  }
  // configured but unknown sync state → unsaved until proven otherwise
  icon.className = 'sync-status-icon unsaved';
  icon.textContent = '✕';
}

function markUnsaved() {
  const icon = document.getElementById('sync-status-icon');
  if (icon.textContent !== '○') {
    icon.className = 'sync-status-icon unsaved';
    icon.textContent = '✕';
  }
}

let editingId = null;
async function showEditModal(id = null) {
  editingId = id;
  const overlay = document.getElementById('modal-overlay');
  overlay.style.display = 'flex';

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
      label.textContent = '请至少选择一个';
      label.style.color = 'var(--danger)';
    } else if (checked.length === mainState.vaults.length) {
      label.textContent = '全部密码库';
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
        showToast('已复制');
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
    showToast('网站、账号和密码为必填项');
    return;
  }
  if (!entry.vaultIds.length) { showToast('至少选择一个密码库'); return; }

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
    showToast('密码已生成');
  });
  render();
}
