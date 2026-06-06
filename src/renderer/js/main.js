let mainState = null;
let searchFields = { website: true, alias: true, account: true, password: false, visible: true };

async function initMainPage() {
  mainState = state;
  renderTable(mainState.vaults, mainState.entries, '', searchFields, false);

  document.getElementById('main-search').addEventListener('input', (e) => {
    const global = document.getElementById('search-global').checked;
    renderTable(mainState.vaults, mainState.entries, e.target.value, searchFields, global);
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
      renderTable(mainState.vaults, mainState.entries, q, searchFields, global);
    });
  });

  document.getElementById('search-global').addEventListener('change', () => {
    const q = document.getElementById('main-search').value;
    const global = document.getElementById('search-global').checked;
    renderTable(mainState.vaults, mainState.entries, q, searchFields, global);
  });

  document.getElementById('main-add-btn').addEventListener('click', () => showEditModal());
  document.getElementById('main-settings-btn').addEventListener('click', () => {
    showPage('settings');
    initSettingsPage();
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
}

let editingId = null;
async function showEditModal(id = null) {
  editingId = id;
  const overlay = document.getElementById('modal-overlay');
  overlay.style.display = 'flex';

  const vaultCheckboxes = document.getElementById('edit-vault-checkboxes');
  vaultCheckboxes.innerHTML = '';
  mainState.vaults.forEach(v => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${v.id}" ${!editingId ? 'checked' : ''}> ${v.name}`;
    vaultCheckboxes.appendChild(label);
  });

  if (id) {
    const entry = mainState.entries.find(e => e.id === id);
    if (entry) {
      document.getElementById('edit-website').value = entry.website;
      document.getElementById('edit-alias').value = entry.alias;
      document.getElementById('edit-account').value = entry.account;
      document.getElementById('edit-password').value = entry.password;
      document.getElementById('edit-description').value = entry.description || '';
      document.getElementById('edit-visible').checked = entry.visible;
      vaultCheckboxes.querySelectorAll('input').forEach(cb => {
        cb.checked = entry.vaultIds.includes(parseInt(cb.value));
      });
    }
  } else {
    document.getElementById('edit-website').value = '';
    document.getElementById('edit-alias').value = '';
    document.getElementById('edit-account').value = '';
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-description').value = '';
    document.getElementById('edit-visible').checked = true;
  }

  document.querySelector('.toggle-password-btn').addEventListener('click', () => {
    const pw = document.getElementById('edit-password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  });
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
    vaultIds: Array.from(document.querySelectorAll('#edit-vault-checkboxes input:checked')).map(cb => parseInt(cb.value)),
    visible: document.getElementById('edit-visible').checked
  };

  if (!entry.website || !entry.password) { showToast('网站和密码为必填项'); return; }

  if (editingId) {
    await window.api.updateEntry(entry);
  } else {
    const result = await window.api.addEntry(entry);
    if (result.success) editingId = result.entry.id;
  }

  closeEditModal();
  mainState = await window.api.getState();
  const q = document.getElementById('main-search').value;
  const global = document.getElementById('search-global').checked;
  renderTable(mainState.vaults, mainState.entries, q, searchFields, global);
  showToast(t('main.savedToast'));
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
    const q = document.getElementById('main-search').value;
    const global = document.getElementById('search-global').checked;
    renderTable(mainState.vaults, mainState.entries, q, searchFields, global);
    showToast(t('main.deletedToast'));
  });
}
