let setupStep = 1;
let recoveryKey = null;
let setupPassword = null;

function initLockScreen() {
  document.getElementById('lock-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') unlockWithPassword();
  });
  document.getElementById('lock-unlock-btn').addEventListener('click', unlockWithPassword);
  document.getElementById('lock-key-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') unlockWithKey();
  });
  document.getElementById('lock-key-btn').addEventListener('click', unlockWithKey);
  document.getElementById('lock-reset-link').addEventListener('click', showResetConfirm);

  if (state.hasVault) return;

  showPage('setup');
  initSetupWizard();
}

async function unlockWithPassword() {
  const password = document.getElementById('lock-password').value;
  const errorEl = document.getElementById('lock-error');
  if (!password) { errorEl.textContent = ''; return; }

  const result = await window.api.unlock(password);
  if (result.success) {
    errorEl.textContent = '';
    state = result.state;
    showPage('main');
    initMainPage();
  } else if (result.error === 'NO_VAULT') {
    errorEl.textContent = t('lock.noVault');
    setTimeout(() => {
      showPage('setup');
      initSetupWizard();
    }, 500);
  } else if (result.error === 'COOLDOWN') {
    errorEl.textContent = t('lock.cooldown').replace('{n}', result.remaining);
    document.getElementById('lock-password').disabled = true;
    const interval = setInterval(() => {
      errorEl.textContent = t('lock.cooldown').replace('{n}', result.remaining--);
      if (result.remaining <= 0) {
        clearInterval(interval);
        document.getElementById('lock-password').disabled = false;
        errorEl.textContent = '';
      }
    }, 1000);
  } else {
    errorEl.textContent = t('lock.wrongPassword').replace('{n}', result.remaining);
  }
}

async function unlockWithKey() {
  const key = document.getElementById('lock-key-input').value;
  const errorEl = document.getElementById('lock-error');
  if (!key) return;

  const result = await window.api.unlockWithKey(key);
  if (result.success) {
    state = result.state;
    showPage('main');
    initMainPage();
  } else {
    errorEl.textContent = t('lock.wrongKey');
  }
}

function showResetConfirm() {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small" style="border:2px solid var(--danger);">
      <h3 style="color:var(--danger);">${t('reset.warning')}</h3>
      <p style="font-size:12px;color:var(--danger);margin:8px 0;">${t('reset.desc1')}</p>
      <p style="font-size:12px;color:var(--text-secondary);margin:4px 0;">${t('reset.desc2')}</p>
      <p style="font-size:12px;color:var(--danger);margin:4px 0;">${t('reset.desc3')}</p>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn" id="reset-cancel-btn">${t('reset.cancel')}</button>
        <button class="btn btn-danger" id="reset-confirm-btn">${t('reset.confirm')}</button>
      </div>
    </div>`;

  document.getElementById('reset-cancel-btn').addEventListener('click', () => overlay.style.display = 'none');
  document.getElementById('reset-confirm-btn').addEventListener('click', async () => {
    overlay.style.display = 'none';
    await window.api.resetData();
    window.location.reload();
  });
}

function initSetupWizard() {
  setupStep = 1;
  document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('active', i === 0));
  document.querySelectorAll('.setup-panel').forEach((p, i) => p.classList.toggle('active', i === 0));

  document.getElementById('setup-step1-next').addEventListener('click', setupStep1Next);

  const radioKeys = document.querySelectorAll('input[name="keyChoice"]');
  radioKeys.forEach(r => r.addEventListener('change', () => {
    const isCustom = document.querySelector('input[name="keyChoice"]:checked').value === 'custom';
    document.getElementById('setup-custom-key-group').style.display = isCustom ? 'block' : 'none';
    document.getElementById('setup-key-display').style.display = isCustom ? 'none' : 'block';
    document.getElementById('setup-saved-check').style.display = 'block';
  }));

  document.getElementById('setup-step2-next').addEventListener('click', setupStep2Next);

  document.getElementById('setup-pick-path').addEventListener('click', async () => {
    const folder = await window.api.pickFolder();
    if (folder) {
      document.getElementById('setup-storage-path').value = folder + '\\vault.pvault';
    }
  });

  const defaultPath = require('electron') ? '' : 'Click Browse to select';
  document.getElementById('setup-storage-path').value = defaultPath;

  document.getElementById('setup-finish').addEventListener('click', setupFinish);
}

async function setupStep1Next() {
  const pw = document.getElementById('setup-password').value;
  const confirm = document.getElementById('setup-password-confirm').value;
  const errorEl = document.getElementById('setup-step1-error');

  if (pw.length < 4) { errorEl.textContent = t('setup.passwordTooShort'); return; }
  if (pw !== confirm) { errorEl.textContent = t('setup.passwordMismatch'); return; }

  setupPassword = pw;
  errorEl.textContent = '';
  switchSetupStep(2);

  document.getElementById('setup-saved-check').style.display = 'block';
  document.getElementById('setup-key-display').style.display = 'block';

  const isCustom = document.querySelector('input[name="keyChoice"]:checked').value === 'custom';
  if (!isCustom) {
    recoveryKey = await window.api.generateKey();
    document.getElementById('setup-key-value').textContent = recoveryKey;
    setupCopyKeyBtn();
  } else {
    document.getElementById('setup-key-value').textContent = '';
  }
}

function setupCopyKeyBtn() {
  const btn = document.getElementById('setup-copy-key');
  btn.onclick = () => {
    window.api.copyToClipboard(recoveryKey, 0);
    showToast('Key copied!');
  };
}

async function setupStep2Next() {
  const errorEl = document.getElementById('setup-step2-error');
  const choice = document.querySelector('input[name="keyChoice"]:checked').value;

  if (choice === 'custom') {
    const customKey = document.getElementById('setup-custom-key').value;
    if (customKey.length < 8) { errorEl.textContent = t('setup.keyTooShort'); return; }
    recoveryKey = customKey;
  }

  if (!document.getElementById('setup-key-saved').checked) {
    errorEl.textContent = 'Please confirm you saved the key';
    return;
  }

  errorEl.textContent = '';
  switchSetupStep(3);
}

async function generateAndDisplayKey() {
  const rawKey = Array.from({ length: 64 }, () =>
    '0123456789abcdef'[Math.floor(Math.random() * 16)]
  ).join('');
  document.getElementById('setup-key-value').textContent = rawKey;
  document.getElementById('setup-copy-key').addEventListener('click', () => {
    window.api.copyToClipboard(rawKey, 0);
    showToast('Key copied!');
  });
  return rawKey;
}

async function setupFinish() {
  const filePath = document.getElementById('setup-storage-path').value;
  const errorEl = document.getElementById('setup-step3-error');
  if (!filePath) { errorEl.textContent = 'Please select a storage path'; return; }

  const check = await window.api.checkStoragePath(filePath);
  if (!check.success || check.exists) {
    errorEl.textContent = t('setup.pathExists');
    return;
  }

  const choice = document.querySelector('input[name="keyChoice"]:checked').value === 'custom' ? 'custom' : 'generate';
  const customKey = recoveryKey;

  const result = await window.api.setup(setupPassword, choice, filePath, customKey);
  if (result.success) {
    state = result.state;
    showPage('main');
    initMainPage();
  } else {
    errorEl.textContent = result.error;
  }
}

function switchSetupStep(step) {
  setupStep = step;
  document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('active', i < step));
  document.querySelectorAll('.setup-panel').forEach((p, i) => p.classList.toggle('active', i === step - 1));
}
