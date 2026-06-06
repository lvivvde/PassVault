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
      let va = sortField === 'id' ? (a.order || 0) : (a[sortField] || '');
      let vb = sortField === 'id' ? (b.order || 0) : (b[sortField] || '');
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      return va < vb ? (sortAsc ? -1 : 1) : va > vb ? (sortAsc ? 1 : -1) : 0;
    });
  }

  container.innerHTML = '';

  // column header row
  const headerRow = document.createElement('div');
  headerRow.className = 'table-header-row';
  const sortableFields = ['id', 'website', 'alias', 'account'];
  const labels = { id: t('table.id'), website: t('table.website'), alias: t('table.alias'), account: t('table.account'), password: t('table.passwordHint'), description: t('table.description') };
  const cells = sortableFields.map(f => {
    const clsMap = { id: 'col-id', website: 'col-website', alias: 'col-alias', account: 'col-account' };
    const arrow = sortField === f ? (sortAsc ? '▲' : '▼') : '';
    return `<span class="${clsMap[f]}" data-sort="${f}">${labels[f]} ${arrow}</span>`;
  });
  headerRow.innerHTML = cells.join('') + '<span class="col-password-hdr" data-sort="password">密码 <small>点击显示</small></span><span class="col-description">' + labels.description + '</span><span class="col-actions"></span><span class="col-drag"></span>';
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
    countEl.textContent = t('main.count', { n: 0 });
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

    const group = document.createElement('div');
    group.className = 'table-group';

    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `<span class="vault-dot"></span><span class="group-name">${escapeHtml(vault.name)}</span><span class="group-count">${vaultEntries.length} 条</span>`;
    group.appendChild(header);

    if (!vaultEntries.length && !globalSearch) {
      const empty = document.createElement('div');
      empty.className = 'table-row';
      empty.style.color = 'var(--text-muted)';
      empty.style.justifyContent = 'center';
      empty.textContent = t('main.noMatch');
      empty.style.fontSize = '12px';
      group.appendChild(empty);
      container.appendChild(group);
      return;
    }

    vaultEntries.forEach(entry => {
      const row = createTableRow(entry, vaults);
      group.appendChild(row);
    });

    container.appendChild(group);
  });

  countEl.textContent = t('main.count', { n: filtered.length });
}

function filterEntries(entries, query, fields, global, vaults) {
  // always filter out hidden entries unless user enables "visible" toggle
  if (!fields.visible) entries = entries.filter(e => e.visible !== false);
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

  // display ID follows visual order (entry.order + 1)
  const displayId = (entry.order || 0) + 1;

  const trunc = (s, n) => { if (!s) return ''; s = String(s); return s.length > n ? s.slice(0, n) + '..' : s; };
  const ws = trunc(entry.website, 11);
  const as = trunc(entry.alias, 11);
  const ac = trunc(entry.account, 11);

  row.innerHTML = `
    <span class="col-id">${displayId}</span>
    <span class="col-website">${escapeHtml(ws)}<button class="btn-icon copy-row-btn" data-text="${escapeAttr(entry.website)}" data-no-clear="1" title="复制网址">📋</button></span>
    <span class="col-alias">${escapeHtml(as)}</span>
    <span class="col-account">${escapeHtml(ac)}<button class="btn-icon copy-row-btn" data-text="${escapeAttr(entry.account)}" data-no-clear="1" title="复制账号">📋</button></span>
    <span class="col-password" data-pw="${escapeAttr(entry.password)}" title="${t('table.passwordTitle')}">••••</span>
    <span class="col-description">${escapeHtml(entry.description || '-')}</span>
    <span class="col-actions"><button class="btn-icon copy-row-btn" data-text="${escapeAttr(entry.password)}" title="${t('table.copyHint')}">📝</button></span>
    <span class="col-drag" title="${t('table.dragHint')}">⠿</span>
  `;

  row.querySelector('.col-password').addEventListener('click', async () => {
    const revealSec = (await window.api.getSettings()).passwordRevealSeconds || 3;
    const pwSpan = row.querySelector('.col-password');
    pwSpan.textContent = entry.password;
    if (revealSec > 0) {
      setTimeout(() => { pwSpan.textContent = '••••'; }, revealSec * 1000);
    }
  });

  row.querySelectorAll('.copy-row-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const text = btn.getAttribute('data-text');
      const noClear = btn.getAttribute('data-no-clear') === '1';
      await window.api.copyToClipboard(text, noClear ? 0 : 1);
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
