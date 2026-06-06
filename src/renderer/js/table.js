let sortField = null;
let sortAsc = true;

function renderTable(vaults, entries, searchQuery, searchFields, globalSearch, activeVaultId = null) {
  const container = document.getElementById('main-table');
  const emptyEl = document.getElementById('main-empty');
  const countEl = document.getElementById('main-count');

  let filtered = filterEntries(entries, searchQuery, searchFields, globalSearch, vaults);

  // filter by sidebar vault selection
  if (activeVaultId !== null) {
    filtered = filtered.filter(e => e.vaultIds && e.vaultIds.includes(activeVaultId));
  }

  // sort
  if (sortField) {
    filtered = [...filtered].sort((a, b) => {
      let va = sortField === 'id' ? (a.id - (vaults.find(v => v.id === a.vaultIds[0])?.idPrefix || 0)) : (a[sortField] || '');
      let vb = sortField === 'id' ? (b.id - (vaults.find(v => v.id === b.vaultIds[0])?.idPrefix || 0)) : (b[sortField] || '');
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      return va < vb ? (sortAsc ? -1 : 1) : va > vb ? (sortAsc ? 1 : -1) : 0;
    });
  }

  container.innerHTML = '';

  // column header row
  const headerRow = document.createElement('div');
  headerRow.className = 'table-row table-header-row';
  const sortableFields = ['id', 'website', 'alias', 'account', 'password', 'description'];
  const labels = { id: 'ID', website: '网站', alias: '别称', account: '账号', password: '密码', description: '描述' };
  const cells = sortableFields.map(f => {
    const clsMap = { id: 'col-id', website: 'col-website', alias: 'col-alias', account: 'col-account', password: 'col-password-hdr', description: 'col-description' };
    const arrow = sortField === f ? (sortAsc ? '▲' : '▼') : '';
    if (f === 'password') return `<span class="col-password-hdr" data-sort="password">${labels[f]} <small>点击显示${arrow}</small></span>`;
    return `<span class="${clsMap[f]}" data-sort="${f}" style="cursor:pointer">${labels[f]} ${arrow}</span>`;
  });
  headerRow.innerHTML = cells.join('') + '<span class="col-copy-hdr"></span><span class="col-drag"></span>';
  container.appendChild(headerRow);

  // sort click handlers
  headerRow.querySelectorAll('[data-sort]').forEach(cell => {
    cell.addEventListener('click', () => {
      if (sortField === cell.dataset.sort) sortAsc = !sortAsc;
      else { sortField = cell.dataset.sort; sortAsc = true; }
      const q = document.getElementById('main-search').value;
      const global = document.getElementById('search-global').checked;
      // re-render from main state (caller's scope has these)
      renderTable(vaults, entries, q, searchFields, global, activeVaultId);
    });
  });

  if (filtered.length === 0) {
    emptyEl.style.display = 'flex';
    countEl.textContent = '0 条记录';
    return;
  }
  emptyEl.style.display = 'none';

  const grouped = {};
  filtered.forEach(e => {
    e.vaultIds.forEach(vid => {
      if (!grouped[vid]) grouped[vid] = [];
      grouped[vid].push(e);
    });
  });

  vaults.forEach(vault => {
    const vaultEntries = grouped[vault.id] || [];
    if (!globalSearch && !vaultEntries.length) return;
    if (!globalSearch && !filtered.some(e => e.vaultIds.includes(vault.id))) return;

    const header = document.createElement('div');
    header.className = 'section-header';
    header.textContent = `── ${vault.name} ──`;
    container.appendChild(header);

    if (!vaultEntries.length && !globalSearch) {
      const empty = document.createElement('div');
      empty.className = 'table-row';
      empty.style.color = 'var(--text-muted)';
      empty.style.justifyContent = 'center';
      empty.textContent = '该密码库暂无匹配条目';
      empty.style.fontSize = '12px';
      container.appendChild(empty);
      return;
    }

    vaultEntries.forEach(entry => {
      const row = createTableRow(entry, vaults);
      container.appendChild(row);
    });
  });

  countEl.textContent = `${filtered.length} 条记录`;
}

function filterEntries(entries, query, fields, global, vaults) {
  if (!query) return entries;
  const q = query.toLowerCase();
  const activeFields = [];
  fields.website && activeFields.push('website');
  fields.alias && activeFields.push('alias');
  fields.account && activeFields.push('account');
  fields.password && activeFields.push('password');

  const passwordMode = fields.password && activeFields.length === 1;

  return entries.filter(e => {
    if (!fields.visible && !e.visible) return false;
    if (passwordMode) return (e.password || '').toLowerCase().includes(q);

    let matched = false;
    for (const f of activeFields) {
      if ((e[f] || '').toLowerCase().includes(q)) matched = true;
    }
    if (!matched && activeFields.length === 0) {
      for (const f of ['website', 'alias', 'account']) {
        if ((e[f] || '').toLowerCase().includes(q)) matched = true;
      }
    }
    return matched;
  });
}

function createTableRow(entry, vaults) {
  const row = document.createElement('div');
  row.className = 'table-row';
  row.setAttribute('data-id', entry.id);
  row.setAttribute('draggable', 'true');

  // show short ID: subtract vault's idPrefix
  let displayId = entry.id;
  if (entry.vaultIds && entry.vaultIds.length) {
    const vault = vaults.find(v => v.id === entry.vaultIds[0]);
    if (vault) displayId = entry.id - vault.idPrefix;
  }

  row.innerHTML = `
    <span class="col-id">${displayId}</span>
    <span class="col-website">${escapeHtml(entry.website)}</span>
    <span class="col-alias">${escapeHtml(entry.alias)}</span>
    <span class="col-account">${escapeHtml(entry.account)}</span>
    <span class="col-password" data-pw="${escapeAttr(entry.password)}" title="点击显示密码">****</span>
    <button class="btn-icon copy-row-btn" data-text="${escapeAttr(entry.password)}" title="复制密码">📝</button>
    <span class="col-description">${escapeHtml(entry.description || '-')}</span>
    <span class="col-drag" title="长按拖拽排序">≡</span>
  `;

  row.querySelector('.col-password').addEventListener('click', async () => {
    const revealSec = (await window.api.getSettings()).passwordRevealSeconds || 3;
    const pwSpan = row.querySelector('.col-password');
    pwSpan.textContent = entry.password;
    if (revealSec > 0) {
      setTimeout(() => { pwSpan.textContent = '****'; }, revealSec * 1000);
    }
  });

  row.querySelectorAll('.copy-row-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const text = btn.getAttribute('data-text');
      await window.api.copyToClipboard(text, 1);
      showToast(t('main.copyToast'));
    });
  });

  return row;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
