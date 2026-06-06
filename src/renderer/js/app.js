let currentPage = null;
const pages = {
  lock: document.getElementById('page-lock'),
  setup: document.getElementById('page-setup'),
  main: document.getElementById('page-main'),
  settings: document.getElementById('page-settings')
};

function showPage(name) {
  Object.values(pages).forEach(p => p.classList.remove('active'));
  if (pages[name]) pages[name].classList.add('active');
  currentPage = name;
}

function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, duration);
}

let state = null;
async function fetchState() {
  state = await window.api.getState();
}

async function initApp() {
  await fetchState();

  const logoPath = await window.api.getAppPath();
  const logo = document.getElementById('header-logo');
  logo.src = `file://${logoPath}/icon/logo.png`;

  const settings = await window.api.getSettings();
  currentLang = settings.language || 'zh-CN';
  setLanguage(currentLang);
  if (settings.theme) {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add('theme-' + settings.theme);
  }

  window.api.onCloseRequest(() => {
    showCloseDialog();
  });

  window.api.onSyncStatus((status) => {
    const el = document.getElementById('main-sync-status');
    if (el) el.textContent = status;
  });

  if (state.status === 'locked') {
    showPage('lock');
    initLockScreen();
  } else if (state.status === 'unlocked') {
    showPage('main');
    initMainPage();
  }
}

function showCloseDialog() {
  const overlay = document.getElementById('delete-confirm-overlay');
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal modal-small">
      <h3>Close PassVault</h3>
      <div style="margin:12px 0;display:flex;flex-direction:column;gap:8px;">
        <label><input type="radio" name="closeOption" value="tray"> Minimize to tray</label>
        <label><input type="radio" name="closeOption" value="quit"> Quit</label>
      </div>
      <label style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;">
        <input type="checkbox" id="remember-close"> Remember choice
      </label>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn" onclick="document.getElementById('delete-confirm-overlay').style.display='none'">Cancel</button>
        <button class="btn btn-primary" id="close-confirm-btn">Confirm</button>
      </div>
    </div>`;

  document.getElementById('close-confirm-btn').addEventListener('click', async () => {
    const choice = document.querySelector('input[name="closeOption"]:checked').value;
    const remember = document.getElementById('remember-close').checked;
    overlay.style.display = 'none';
    if (remember) await window.api.setSetting('closeBehavior', choice);
    if (choice === 'tray') {
      window.api.setSetting('_temp_tray', true);
      window.location.reload();
    } else {
      window.close();
    }
  });
}

document.addEventListener('DOMContentLoaded', initApp);
