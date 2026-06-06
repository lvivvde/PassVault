const panels = {
  general: `
    <h3>通用</h3>
    <p class="section-desc">语言、主题和界面基础设置</p>
    <div class="settings-section">
      <div class="setting-row"><label>语言</label><select id="setting-language"><option value="zh-CN">简体中文</option><option value="en">English</option></select></div>
      <div class="setting-row"><label>主题</label><select id="setting-theme"><option value="light">浅色</option><option value="dark">深色</option></select></div>
      <div class="setting-row"><label>界面缩放</label><select id="setting-zoom"><option value="0.9">90%</option><option value="1" selected>100%</option><option value="1.1">110%</option><option value="1.25">125%</option></select></div>
      <div class="setting-row"><label>调试日志</label><input type="checkbox" id="setting-log"></div>
    </div>`,

  security: `
    <h3>安全</h3>
    <p class="section-desc">密码、密钥、锁屏和剪切板安全设置</p>
    <div class="settings-section">
      <div class="setting-row"><label>修改主密码</label><button class="btn btn-small" id="setting-change-password">修改 →</button></div>
      <div class="setting-row"><label>恢复密钥</label><span class="key-hint" id="setting-key-hint">--------</span></div>
      <div class="setting-row"><label>重新生成密钥</label><button class="btn btn-small" id="setting-regenerate-key">重置 →</button></div>
      <div class="setting-row"><label>自动锁屏</label><select id="setting-auto-lock"><option value="5">5 分钟</option><option value="15">15 分钟</option><option value="30" selected>30 分钟</option><option value="60">1 小时</option><option value="120">2 小时</option><option value="0">永不</option></select></div>
      <div class="setting-row"><label>登录错误上限</label><select id="setting-login-limit"><option value="3">3次</option><option value="5" selected>5次</option><option value="7">7次</option><option value="11">11次</option><option value="99">自定义(最多99)</option></select></div>
      <div class="setting-row"><label>密码明文显示时长</label><select id="setting-reveal-duration"><option value="3" selected>3 秒</option><option value="5">5 秒</option><option value="10">10 秒</option><option value="30">30 秒</option><option value="0">永不隐藏</option></select></div>
      <div class="setting-row"><label>剪切板自动清除</label><select id="setting-clipboard"><option value="1" selected>1 分钟</option><option value="3">3 分钟</option><option value="5">5 分钟</option><option value="0">不清除</option></select></div>
    </div>`,

  shortcuts: `
    <h3>快捷键</h3>
    <p class="section-desc">全局快捷操作</p>
    <div class="settings-section">
      <div class="setting-row"><label>搜索</label><span class="shortcut-badge"><span>Ctrl</span><span class="key-plus">+</span><span>F</span></span></div>
      <div class="setting-row"><label>新建</label><span class="shortcut-badge"><span>Ctrl</span><span class="key-plus">+</span><span>N</span></span></div>
    </div>`,

  trash: `<h3>回收站</h3><p class="section-desc">已删除的密码条目，可恢复或永久清空</p>
    <div class="settings-section"><div class="trash-list" id="trash-list"><p class="trash-empty">回收站为空</p></div></div>
    <button class="btn btn-small btn-danger" id="clear-trash-btn" style="margin-top:8px;">清空回收站</button>`,

  vaults: `<h3>密码库管理</h3><p class="section-desc">管理你的密码库分组</p>
    <div class="settings-section"><div class="vault-list" id="vault-list"></div>
    <div class="vault-list-footer"><button class="btn btn-small btn-add-vault" id="add-vault-btn">+ 新建密码库</button></div></div>`,

  sync: `
    <h3>同步</h3>
    <div class="setting-row"><label>同步方式</label><select id="setting-sync-mode"><option value="none">无</option><option value="webdav">WebDAV</option><option value="folder">本地文件夹</option></select></div>
    <div id="sync-webdav-config" style="display:none">
      <div class="setting-row"><input class="input" placeholder="WebDAV 地址 (如 https://dav.example.com)" id="setting-webdav-url"></div>
      <div class="setting-row"><input class="input" placeholder="用户名" id="setting-webdav-user"></div>
      <div class="setting-row"><input type="password" class="input" placeholder="密码" id="setting-webdav-password"></div>
      <div class="setting-row"><label>同步间隔</label><select id="setting-sync-interval"><option value="5">5 分钟</option><option value="15" selected>15 分钟</option><option value="30">30 分钟</option><option value="60">1 小时</option></select></div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <button class="btn btn-small" id="test-webdav-btn">测试连接</button>
        <button class="btn btn-small" id="sync-push-btn">立即上传</button>
        <button class="btn btn-small" id="sync-pull-btn">立即下载</button>
      </div>
      <p id="sync-status-text" style="font-size:11px;color:var(--text-muted);margin-top:6px;"></p>
    </div>
    <div id="sync-folder-config" style="display:none">
      <div class="setting-row"><input class="input" id="setting-folder-path" readonly><button class="btn btn-small" id="pick-folder-btn">浏览</button></div>
    </div>`,

  data: `
    <h3>数据管理</h3>
    <button class="btn btn-small" id="export-plain-btn">导出明文</button>
    <button class="btn btn-small" id="export-encrypted-btn">导出加密</button>
    <button class="btn btn-small" id="import-btn">导入密码库</button>`,

  storage: `
    <h3>存储</h3>
    <div class="setting-row"><label>密码库路径</label><span class="path-display" id="setting-storage-path"></span></div>
    <div class="setting-row"><button class="btn btn-small" id="setting-change-path">更改路径</button></div>`,

  log: `
    <h3>日志</h3>
    <div class="setting-row"><label>启用日志</label><input type="checkbox" id="setting-log-panel"></div>
    <div class="setting-row"><label>日志目录</label><span class="path-display" id="setting-log-dir"></span></div>
    <div class="setting-row"><button class="btn btn-small" id="setting-open-log-dir">打开日志目录</button></div>
    <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">日志文件保存在项目目录 logs/ 下，按日期命名。开启后可记录加解密操作、数据变更等事件，便于排查问题。</p>`,

  about: `<h3>关于</h3><p>密码保管箱 v1.0.0</p>`
};

let activeCat = 'general';

function switchPanel(cat) {
  activeCat = cat;
  document.getElementById('settings-panel').innerHTML = panels[cat];
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.toggle('active', s.dataset.cat === cat));

  bindPanelEvents(cat);
}

async function bindPanelEvents(cat) {
  if (cat === 'general') {
    document.getElementById('setting-language').value = settingsCache.language || 'zh-CN';
    document.getElementById('setting-theme').value = settingsCache.theme || 'light';
    document.getElementById('setting-log').checked = settingsCache.logEnabled || false;

    // zoom
    const zoom = await window.api.getZoom();
    document.getElementById('setting-zoom').value = String(zoom || 1);
    document.getElementById('setting-zoom').addEventListener('change', async (e) => {
      await window.api.setZoom(parseFloat(e.target.value));
      showToast('缩放已应用');
    });

    ['language', 'theme'].forEach(id => {
      document.getElementById('setting-' + id).addEventListener('change', async (e) => {
        const keyMap = { language: 'language', theme: 'theme' };
        await window.api.setSetting(keyMap[id], e.target.value);
        if (id === 'theme') {
          document.body.classList.remove('theme-dark', 'theme-light');
          document.body.classList.add('theme-' + e.target.value);
        }
        if (id === 'language') {
          await window.api.setSetting('language', e.target.value);
          window.location.reload();
        }
      });
    });
    document.getElementById('setting-log').addEventListener('change', async (e) => {
      await window.api.toggleLog(e.target.checked);
      showToast(e.target.checked ? '日志已开启' : '日志已关闭');
    });
  }

  if (cat === 'security') {
    document.getElementById('setting-auto-lock').value = settingsCache.autoLockMinutes || 30;
    document.getElementById('setting-login-limit').value = settingsCache.loginAttemptLimit || 5;
    document.getElementById('setting-reveal-duration').value = settingsCache.passwordRevealSeconds || 3;
    if (state.recoveryKeyHint) {
      document.getElementById('setting-key-hint').textContent = state.recoveryKeyHint;
    }
    ['auto-lock', 'login-limit', 'reveal-duration'].forEach(id => {
      document.getElementById('setting-' + id).addEventListener('change', async (e) => {
        const keyMap = { 'auto-lock': 'autoLockMinutes', 'login-limit': 'loginAttemptLimit', 'reveal-duration': 'passwordRevealSeconds' };
        await window.api.setSetting(keyMap[id], parseInt(e.target.value));
      });
    });
    document.getElementById('setting-change-password').addEventListener('click', showChangePassword);
    document.getElementById('setting-regenerate-key').addEventListener('click', showRegenerateKey);

    // clipboard (merged into security)
    document.getElementById('setting-clipboard').value = settingsCache.clipboardClearMinutes || 1;
    document.getElementById('setting-clipboard').addEventListener('change', async (e) => {
      await window.api.setSetting('clipboardClearMinutes', parseInt(e.target.value));
    });
  }

  if (cat === 'trash') {
    renderTrash();
    document.getElementById('clear-trash-btn').addEventListener('click', clearTrash);
  }

  if (cat === 'vaults') {
    renderVaultList();
    document.getElementById('add-vault-btn').addEventListener('click', showAddVault);
  }

  if (cat === 'sync') {
    const syncCfg = settingsCache.syncConfig || {};
    const mode = document.getElementById('setting-sync-mode');
    mode.value = syncCfg.mode || 'none';

    const webdavDiv = document.getElementById('sync-webdav-config');
    const folderDiv = document.getElementById('sync-folder-config');
    function toggleSyncConfig() {
      webdavDiv.style.display = mode.value === 'webdav' ? 'block' : 'none';
      folderDiv.style.display = mode.value === 'folder' ? 'block' : 'none';
    }
    mode.addEventListener('change', () => {
      toggleSyncConfig();
      const cfg = { mode: mode.value };
      if (cfg.mode !== 'webdav') {
        window.api.syncConfig({ mode: cfg.mode });
      }
    });
    toggleSyncConfig();

    if (syncCfg.url) document.getElementById('setting-webdav-url').value = syncCfg.url;
    if (syncCfg.username) document.getElementById('setting-webdav-user').value = syncCfg.username;
    if (syncCfg.password) document.getElementById('setting-webdav-password').value = syncCfg.password;
    document.getElementById('setting-sync-interval').value = syncCfg.interval || 15;

    // folder sync config
    if (syncCfg.path) document.getElementById('setting-folder-path').value = syncCfg.path;
    document.getElementById('pick-folder-btn').addEventListener('click', async () => {
      const folder = await window.api.pickFolder();
      if (folder) {
        document.getElementById('setting-folder-path').value = folder;
        await window.api.syncConfig({ mode: 'folder', path: folder, interval: parseInt(document.getElementById('setting-sync-interval').value) });
        showToast('同步文件夹已设置');
      }
    });

    if (mode.value === 'folder' && syncCfg.path) {
      // auto-activate folder sync on panel open
      window.api.syncConfig({ mode: 'folder', path: syncCfg.path, interval: syncCfg.interval || 15 });
    }

    document.getElementById('test-webdav-btn').addEventListener('click', async () => {
      const url = document.getElementById('setting-webdav-url').value;
      const user = document.getElementById('setting-webdav-user').value;
      const pass = document.getElementById('setting-webdav-password').value;
      if (!url || !user || !pass) { showToast('请填写 WebDAV 地址、用户名和密码'); return; }
      showToast('正在测试连接...');
      const result = await window.api.syncTest(url, user, pass);
      showToast(result.message);
      document.getElementById('sync-status-text').textContent = result.message;
    });

    document.getElementById('sync-push-btn').addEventListener('click', async () => {
      const url = document.getElementById('setting-webdav-url').value;
      const user = document.getElementById('setting-webdav-user').value;
      const pass = document.getElementById('setting-webdav-password').value;
      if (!url || !user || !pass) { showToast('请先配置 WebDAV 信息'); return; }
      // save config first
      const cfg = { mode: 'webdav', url, username: user, password: pass, interval: parseInt(document.getElementById('setting-sync-interval').value) };
      await window.api.syncConfig(cfg);
      const result = await window.api.syncPush();
      showToast(result.success ? `上传成功 (${(result.size/1024).toFixed(1)} KB)` : result.message);
    });

    document.getElementById('sync-pull-btn').addEventListener('click', async () => {
      const url = document.getElementById('setting-webdav-url').value;
      const user = document.getElementById('setting-webdav-user').value;
      const pass = document.getElementById('setting-webdav-password').value;
      if (!url || !user || !pass) { showToast('请先配置 WebDAV 信息'); return; }
      const cfg = { mode: 'webdav', url, username: user, password: pass, interval: parseInt(document.getElementById('setting-sync-interval').value) };
      await window.api.syncConfig(cfg);
      const result = await window.api.syncPull();
      showToast(result.success ? `下载成功 (${(result.size/1024).toFixed(1)} KB)，请重新解锁` : result.message);
    });

    document.getElementById('setting-sync-interval').addEventListener('change', async () => {
      const url = document.getElementById('setting-webdav-url').value;
      const user = document.getElementById('setting-webdav-user').value;
      const pass = document.getElementById('setting-webdav-password').value;
      const interval = parseInt(document.getElementById('setting-sync-interval').value);
      if (url && user && pass) {
        await window.api.syncConfig({ mode: 'webdav', url, username: user, password: pass, interval });
      }
    });
  }

  if (cat === 'data') {
    document.getElementById('export-plain-btn').addEventListener('click', exportPlain);
    document.getElementById('export-encrypted-btn').addEventListener('click', exportEncrypted);
    document.getElementById('import-btn').addEventListener('click', importFile);
  }

  if (cat === 'storage') {
    document.getElementById('setting-storage-path').textContent = settingsCache.storagePath || '未设置';
    document.getElementById('setting-change-path').addEventListener('click', showChangePath);
  }

  if (cat === 'log') {
    document.getElementById('setting-log-panel').checked = settingsCache.logEnabled || false;
    document.getElementById('setting-log-panel').addEventListener('change', async (e) => {
      await window.api.toggleLog(e.target.checked);
      showToast(e.target.checked ? '日志已开启' : '日志已关闭');
    });
    window.api.getLogDir().then(dir => {
      document.getElementById('setting-log-dir').textContent = dir || '';
    });
    document.getElementById('setting-open-log-dir').addEventListener('click', async () => {
      await window.api.openLogDir();
      showToast('已打开日志目录');
    });
  }
}

let settingsCache = {};

async function initSettingsPage() {
  settingsCache = await window.api.getSettings();

  document.getElementById('settings-back-btn').addEventListener('click', () => {
    showPage('main');
    initMainPage();
  });

  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => switchPanel(item.dataset.cat));
  });

  switchPanel('general');
}

// ─── Storage ────────────────────────────────────────────────

async function showChangePath() {
  const folder = await window.api.pickFolder();
  if (!folder) return;

  const newPath = folder + '\\vault.pvault';
  const check = await window.api.checkStoragePath(newPath);
  if (!check.success || check.exists) {
    showToast('该路径已存在密码库文件，请选择其他目录');
    return;
  }

  await window.api.setSetting('storagePath', newPath);
  settingsCache.storagePath = newPath;
  document.getElementById('setting-storage-path').textContent = newPath;
  showToast('密码库路径已更新');
}

// ─── Security ───────────────────────────────────────────────

async function showChangePassword() {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small">
      <h3>修改主密码</h3>
      <div class="form-group"><input type="password" id="change-old-pw" class="input" placeholder="当前主密码"></div>
      <div class="form-group"><input type="password" id="change-new-pw" class="input" placeholder="新主密码（至少4位）"></div>
      <div class="form-group"><input type="password" id="change-new-pw-confirm" class="input" placeholder="确认新密码"></div>
      <p id="change-pw-error" style="color:var(--danger);font-size:12px;display:none;"></p>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn" id="change-pw-cancel">取消</button>
        <button class="btn" id="change-pw-confirm">确认修改</button>
      </div>
    </div>`;

  document.getElementById('change-pw-cancel').addEventListener('click', () => overlay.style.display = 'none');
  document.getElementById('change-pw-confirm').addEventListener('click', async () => {
    const oldPw = document.getElementById('change-old-pw').value;
    const newPw = document.getElementById('change-new-pw').value;
    const confirm = document.getElementById('change-new-pw-confirm').value;
    const errEl = document.getElementById('change-pw-error');

    if (!oldPw || !newPw) { errEl.textContent = '请填写所有字段'; errEl.style.display = 'block'; return; }
    if (newPw.length < 4) { errEl.textContent = '新密码至少4位'; errEl.style.display = 'block'; return; }
    if (newPw !== confirm) { errEl.textContent = '两次密码不一致'; errEl.style.display = 'block'; return; }

    const result = await window.api.changeMasterPassword(oldPw, newPw);
    if (result.success) {
      overlay.style.display = 'none';
      showToast('主密码已修改');
    } else {
      errEl.textContent = '当前密码错误';
      errEl.style.display = 'block';
    }
  });
}

async function showRegenerateKey() {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small" style="border:2px solid var(--warning);">
      <h3 style="color:var(--warning);">重新生成恢复密钥</h3>
      <p style="font-size:12px;color:var(--text-secondary);margin:8px 0;">重新生成后，旧密钥将立即失效。请确认已输入主密码。</p>
      <div class="form-group"><input type="password" id="regen-pw" class="input" placeholder="当前主密码"></div>
      <p id="regen-error" style="color:var(--danger);font-size:12px;display:none;"></p>
      <p id="regen-result" style="color:var(--success);font-size:12px;display:none;"></p>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn" id="regen-cancel">取消</button>
        <button class="btn btn-warning" id="regen-confirm">重新生成</button>
      </div>
    </div>`;

  document.getElementById('regen-cancel').addEventListener('click', () => overlay.style.display = 'none');
  document.getElementById('regen-confirm').addEventListener('click', async () => {
    const pw = document.getElementById('regen-pw').value;
    if (!pw) { document.getElementById('regen-error').style.display = 'block'; document.getElementById('regen-error').textContent = '请输入主密码'; return; }

    const result = await window.api.regenerateKey(pw);
    if (result.success) {
      document.getElementById('regen-error').style.display = 'none';
      const resEl = document.getElementById('regen-result');
      resEl.textContent = '新恢复密钥: ' + result.recoveryKey + '（请立即备份！）';
      resEl.style.display = 'block';
      document.getElementById('setting-key-hint').textContent = result.recoveryKey.slice(0, 4) + '****' + result.recoveryKey.slice(-4);
      state.recoveryKeyHint = result.recoveryKey.slice(0, 4) + '****' + result.recoveryKey.slice(-4);
      document.getElementById('regen-confirm').style.display = 'none';
    } else {
      document.getElementById('regen-error').style.display = 'block';
      document.getElementById('regen-error').textContent = result.error || '密码错误';
    }
  });
}

// ─── Trash ──────────────────────────────────────────────────

function renderTrash() {
  const list = document.getElementById('trash-list');
  const trash = state.trash || [];
  if (!trash.length) {
    list.innerHTML = '<p class="trash-empty">回收站为空</p>';
    return;
  }
  list.innerHTML = trash.map((t, i) => `
    <div class="trash-item">
      <span class="trash-name">${escHtml(t.entry.website || t.entry.alias || '(无名称)')}</span>
      <span class="trash-account">${escHtml(t.entry.account)}</span>
      <span class="trash-date">${t.deletedAt ? new Date(t.deletedAt).toLocaleDateString() : ''}</span>
      <button class="btn btn-tiny" data-restore="${t.entry.id}">还原</button>
    </div>`).join('');

  list.querySelectorAll('[data-restore]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.restore);
      const ok = await window.api.restoreEntry(id);
      if (ok) {
        state = await window.api.getState();
        renderTrash();
        showToast('已还原');
      }
    });
  });
}

async function clearTrash() {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small"><h3>清空回收站</h3><p style="font-size:12px;color:var(--text-secondary);">确认后无法恢复。</p>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn" id="clear-trash-cancel">取消</button>
        <button class="btn btn-danger" id="clear-trash-confirm">确认清空</button>
      </div></div>`;

  document.getElementById('clear-trash-cancel').addEventListener('click', () => overlay.style.display = 'none');
  document.getElementById('clear-trash-confirm').addEventListener('click', async () => {
    await window.api.clearTrash();
    state = await window.api.getState();
    overlay.style.display = 'none';
    renderTrash();
    showToast('回收站已清空');
  });
}

// ─── Vaults ─────────────────────────────────────────────────

function renderVaultList() {
  const list = document.getElementById('vault-list');
  const vaults = state.vaults || [];
  list.innerHTML = vaults.map(v => `
    <div class="vault-item">
      <span class="vault-name">${escHtml(v.name)}</span>
      <span class="vault-id">ID: ${v.id}</span>
      <span class="vault-count">${(state.entries || []).filter(e => e.vaultIds && e.vaultIds.includes(v.id)).length} 条</span>
      ${vaults.length > 1 ? `<button class="btn-delete-vault" data-delete-vault="${v.id}">删除</button>` : ''}
    </div>`).join('');

  list.querySelectorAll('[data-delete-vault]').forEach(btn => {
    btn.addEventListener('click', () => {
      const vaultId = parseInt(btn.dataset.deleteVault);
      showDeleteVaultDialog(vaultId);
    });
  });
}

function showDeleteVaultDialog(vaultId) {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small"><h3>删除密码库</h3>
      <p style="font-size:12px;color:var(--text-secondary);">请选择对库内条目的处理方式：</p>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
        <button class="btn btn-small" id="vault-delete-move">移动到默认库</button>
        <button class="btn btn-small btn-danger" id="vault-delete-remove">删除所有条目</button>
        <button class="btn btn-small" id="vault-delete-cancel">取消</button>
      </div></div>`;

  document.getElementById('vault-delete-cancel').addEventListener('click', () => overlay.style.display = 'none');
  document.getElementById('vault-delete-move').addEventListener('click', async () => {
    await window.api.deleteVault(vaultId, 'move');
    state = await window.api.getState();
    overlay.style.display = 'none';
    renderVaultList();
    showToast('密码库已删除，条目已移动');
  });
  document.getElementById('vault-delete-remove').addEventListener('click', async () => {
    await window.api.deleteVault(vaultId, 'delete');
    state = await window.api.getState();
    overlay.style.display = 'none';
    renderVaultList();
    showToast('密码库及条目已删除');
  });
}

async function showAddVault() {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small">
      <h3>新建密码库</h3>
      <div class="form-group"><input id="new-vault-name" class="input" placeholder="密码库名称"></div>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn" id="new-vault-cancel">取消</button>
        <button class="btn btn-primary" id="new-vault-confirm">创建</button>
      </div>
    </div>`;

  document.getElementById('new-vault-cancel').addEventListener('click', () => overlay.style.display = 'none');
  document.getElementById('new-vault-confirm').addEventListener('click', async () => {
    const name = document.getElementById('new-vault-name').value.trim();
    if (!name) return;
    const result = await window.api.addVault(name);
    if (result.success) {
      overlay.style.display = 'none';
      state = await window.api.getState();
      renderVaultList();
      showToast('密码库已创建');
    }
  });
  document.getElementById('new-vault-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('new-vault-confirm').click();
  });
}

// ─── Data Management ────────────────────────────────────────

async function exportPlain() {
  const filePath = await window.api.saveFile([{ name: 'JSON Files', extensions: ['json'] }]);
  if (!filePath) return;
  await window.api.exportPlain(filePath);
  showToast('明文导出成功: ' + filePath);
}

async function exportEncrypted() {
  const filePath = await window.api.saveFile([{ name: 'PassVault Files', extensions: ['pvault'] }]);
  if (!filePath) return;
  await window.api.exportEncrypted(filePath);
  showToast('加密导出成功: ' + filePath);
}

async function importFile() {
  const filePath = await window.api.pickFile([{ name: 'PassVault Files', extensions: ['json', 'pvault'] }]);
  if (!filePath) return;

  const isEncrypted = filePath.endsWith('.pvault');
  let password = null;

  if (isEncrypted) {
    password = prompt('请输入该加密文件的密码：');
    if (!password) return;
  }

  const result = await window.api.importFile(filePath, isEncrypted ? 'encrypted' : 'plain', password);
  if (!result.success) {
    showToast('导入失败: ' + (result.error || '未知错误'));
    return;
  }

  const entries = result.entries;
  const conflicts = result.conflicts || [];

  if (conflicts.length === 0) {
    // no conflicts, import directly
    const res = await window.api.importFinalize(entries, {});
    showToast(`成功导入 ${res.added} 条记录`);
    state = await window.api.getState();
    return;
  }

  // show conflict resolution dialog
  showImportConflictDialog(entries, conflicts);
}

let conflictIndex = 0;
let conflictMap = {};

function showImportConflictDialog(entries, conflicts) {
  if (conflictIndex >= conflicts.length) {
    // all resolved, finalize
    finalizeImport(entries);
    return;
  }

  const c = conflicts[conflictIndex];
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small">
      <h3>发现重复条目 (${conflictIndex + 1}/${conflicts.length})</h3>
      <p style="font-size:12px;color:var(--text-secondary);margin:8px 0;">
        <b>导入:</b> ${c.entry.website || '-'} / ${c.entry.alias || '-'} / ${c.entry.account || '-'}<br>
        已存在同名条目（网站+别名+账号一致）
      </p>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
        <button class="btn btn-small" id="conf-skip">跳过此条</button>
        <button class="btn btn-small" id="conf-overwrite">覆盖已有条目</button>
        <button class="btn btn-small" id="conf-skip-all">跳过所有冲突</button>
        <button class="btn btn-small btn-danger" id="conf-overwrite-all">覆盖所有冲突</button>
      </div>
    </div>`;

  document.getElementById('conf-skip').addEventListener('click', () => {
    conflictMap[c.index] = 'skip';
    conflictIndex++;
    overlay.style.display = 'none';
    showImportConflictDialog(entries, conflicts);
  });
  document.getElementById('conf-overwrite').addEventListener('click', () => {
    conflictMap[c.index] = 'overwrite';
    conflictIndex++;
    overlay.style.display = 'none';
    showImportConflictDialog(entries, conflicts);
  });
  document.getElementById('conf-skip-all').addEventListener('click', () => {
    conflicts.forEach(cn => { conflictMap[cn.index] = 'skip'; });
    conflictIndex = conflicts.length;
    overlay.style.display = 'none';
    finalizeImport(entries);
  });
  document.getElementById('conf-overwrite-all').addEventListener('click', () => {
    conflicts.forEach(cn => { conflictMap[cn.index] = 'overwrite'; });
    conflictIndex = conflicts.length;
    overlay.style.display = 'none';
    finalizeImport(entries);
  });
}

async function finalizeImport(entries) {
  const res = await window.api.importFinalize(entries, conflictMap);
  showToast(`成功导入 ${res.added} 条记录`);
  state = await window.api.getState();
  conflictIndex = 0;
  conflictMap = {};
}

// ─── Helpers ────────────────────────────────────────────────

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
