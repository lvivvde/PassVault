// PassVault i18n — v1.0 Phase 1
// Flattened dictionary, loaded as global script, no dependencies
(function () {
  'use strict';

  var FALLBACK = {"common.next":"下一步","common.copy":"复制","common.save":"保存","common.cancel":"取消","common.delete":"删除","common.close":"关闭","common.confirm":"确定","common.back":"返回","common.paste":"粘贴","common.all":"全部","common.generate":"生成","common.refresh":"重新生成","common.use":"使用","common.skip":"跳过","common.loading":"加载中...","lock.enterPassword":"请输入主密码解锁","lock.passwordPlaceholder":"主密码","lock.unlock":"解锁","lock.or":"或","lock.useRecoveryKey":"使用恢复密钥解锁","lock.keyPlaceholder":"恢复密钥","lock.verifyKey":"验证密钥","lock.resetData":"重置所有数据 →","lock.wrongPassword":"密码错误，剩余 {n} 次","lock.cooldown":"已锁定，{n} 秒后重试","lock.wrongKey":"密钥错误","lock.noVault":"未找到密码库文件","reset.warning":"⚠ 警告：此操作不可逆","reset.desc1":"将清除主密码和所有软件设置","reset.desc2":"密码库文件 (.pvault) 不会被删除","reset.desc3":"如果密钥也丢失，将永久无法恢复","reset.confirm":"我了解风险，确认重置","reset.cancel":"取消","setup.step1Title":"设置主密码","setup.step1Hint":"至少4位，无复杂度要求。丢失无法恢复。","setup.password":"主密码","setup.confirmPassword":"确认主密码","setup.step2Title":"设置恢复密钥","setup.step2Warning":"密钥仅展示一次！请立即保存。若丢失，可在解锁后通过设置重新生成。","setup.generateKey":"自动生成密钥","setup.customKey":"自定义密钥（≥8位）","setup.yourKey":"你的恢复密钥：","setup.keySaved":"我已安全保存密钥，了解丢失无法恢复","setup.step3Title":"选择存储位置","setup.storagePath":"密码库存储路径","setup.changePath":"浏览","setup.storageHint":"存放在其他人无法访问的位置。不能使用已有文件的路径。","setup.finish":"完成并进入","setup.passwordMismatch":"两次密码不一致","setup.passwordTooShort":"密码至少4位","setup.keyTooShort":"密钥至少8位","setup.pathExists":"该路径下已存在文件","setup.prev":"上一步","setup.next":"下一步","main.add":"＋ 添加","main.lock":"🔒 锁定","main.settings":"⚙ 设置","main.searchPlaceholder":"搜索密码...","main.empty":"还没有密码，点击 + 添加第一条","main.count":"{n} 条记录","main.copyToast":"已复制","main.savedToast":"已保存","main.deletedToast":"已移至回收站","main.globalSearch":"全局搜索","main.websiteFirst":"网站优先显示","main.aliasFirst":"别称优先显示","main.accountFirst":"账号优先显示","main.passwordFirst":"密码优先显示","main.noMatch":"该密码库暂无匹配条目","edit.title":"编辑密码","edit.newTitle":"添加密码","edit.website":"网站","edit.alias":"别称","edit.account":"账号","edit.password":"密码","edit.description":"描述","edit.vault":"归属密码库","edit.visible":"在主界面显示","edit.required":"网站、账号和密码为必填项","edit.vaultRequired":"至少选择一个密码库","edit.unsavedTitle":"未保存的内容","edit.unsavedBody":"有未保存的内容，确定关闭吗？","edit.unsavedCancel":"取消","edit.unsavedClose":"关闭","edit.deleteTitle":"确认删除","edit.deleteBody":"此操作会将条目移至回收站，可以在设置中恢复。确定要删除吗？","edit.pasteBtn":"粘贴","edit.copyBtn":"复制","edit.generateBtn":"生成","edit.showPassword":"显示密码","edit.allVaults":"全部密码库","edit.selectVault":"请至少选择一个","edit.selected":"已选 {n} 个","table.id":"ID","table.website":"网站","table.alias":"别称","table.account":"账号","table.passwordHint":"点击显示","table.description":"描述","sync.button":"🔄 同步","sync.notConfigured":"尚未配置云同步，请先在设置中填写同步信息","sync.disabled":"云同步功能未开启，请在设置中启用","sync.sameContent":"本地与云端数据一致，无需同步","sync.noCloudFile":"云端没有同步文件，是否上传本地密码库？","sync.noLocalFile":"本地没有密码库文件，是否从云端下载？","sync.cloudUpdate":"云端有更新","sync.cloudUpdateBody":"云端版本 {remoteVersion} > 本地版本 {localVersion}","sync.firstSync":"首次同步，正在上传本地数据","sync.bothModified":"本地和云端都有新的修改，需要你来决定保留哪一份","sync.differentVault":"本地和云端属于不同的密码库，无法自动合并","sync.massDelete":"本地删除了较多密码条目，为防止误删请确认","sync.hashMismatch":"本地和云端版本号相同但内容不一致，可能是在其他设备上同时修改导致的","sync.keyMismatch":"当前密钥无法解密云端文件，可能是在其他设备上使用了不同的主密码","sync.compareTitle":"本地与云端数据不一致","sync.upload":"⬆ 使用本地数据覆盖云端","sync.download":"⬇ 使用云端数据覆盖本地","sync.cancelSync":"取消同步","sync.pushing":"正在上传...","sync.pulling":"正在下载...","sync.pushOk":"已同步到云端","sync.pullOk":"已从云端下载","sync.pushFail":"上传失败","sync.pullFail":"下载失败","sync.uploadLabel":"已上传到云端","sync.pullLabel":"已从云端下载","sync.vaultDifferentTitle":"密码库不匹配","settings.general":"通用","settings.security":"安全","settings.sync":"同步","settings.data":"数据管理","settings.storage":"存储","settings.log":"日志","settings.about":"关于","settings.theme":"主题","settings.zoom":"界面缩放","settings.dark":"深色","settings.light":"浅色","settings.language":"语言","settings.langZh":"简体中文","settings.langEn":"English","settings.changePassword":"修改主密码","settings.autoLock":"自动锁屏","settings.clipboard":"剪切板","settings.retentionMinutes":"清除时间（分钟）","settings.idleMinutes":"闲置锁屏（分钟）","settings.regenerateKey":"重新生成","settings.regenerateHint":"生成后需重新保存密钥","settings.trash":"回收站","settings.trashEmpty":"回收站为空","settings.trashRestored":"已恢复","settings.trashCleared":"回收站已清空","settings.vaults":"密码库管理","settings.newVault":"新建密码库","settings.newVaultTitle":"新建密码库","settings.newVaultPlaceholder":"密码库名称","settings.newVaultCreate":"创建","settings.newVaultCreated":"密码库已创建","settings.exportPlain":"导出明文","settings.exportEncrypted":"导出加密","settings.importFile":"导入密码库","settings.importConflicts":"发现重复条目","settings.importSkip":"跳过此条","settings.importOverwrite":"覆盖已有条目","settings.importSkipAll":"跳过所有冲突","settings.importOverwriteAll":"覆盖所有冲突","settings.importSuccess":"成功导入 {n} 条记录","settings.importFail":"导入失败","settings.syncMode":"同步方式","settings.syncNone":"无","settings.syncWebDAV":"WebDAV","settings.syncFolder":"本地文件夹","settings.syncUrl":"WebDAV 地址","settings.syncUsername":"用户名","settings.syncPassword":"密码","settings.syncInterval":"同步间隔","settings.syncTestBtn":"测试连接","settings.syncPushBtn":"立即上传","settings.syncPullBtn":"立即下载","settings.syncTesting":"正在测试连接...","settings.syncTestOk":"连接成功","settings.syncTestFail":"连接失败","settings.syncConfigFirst":"请先配置同步信息","settings.syncPushOk":"上传成功 ({n} KB)","settings.syncPullOk":"下载成功 ({n} KB)，请重新解锁","settings.sync5min":"5 分钟","settings.sync15min":"15 分钟","settings.sync30min":"30 分钟","settings.sync60min":"1 小时","settings.logEnabled":"启用日志","settings.logDir":"日志目录","settings.openLogDir":"打开日志目录","settings.logDirOpened":"已打开日志目录","settings.logOn":"日志已开启","settings.logOff":"日志已关闭","settings.logDesc":"日志文件保存在项目目录 logs/ 下，按日期命名。开启后可记录加解密操作、数据变更等事件，便于排查问题。","settings.storagePathLabel":"存储路径","settings.changeStorage":"更改路径","settings.keyHint":"点击重置生成新密钥","settings.deleteVault":"删除","settings.sortToast":"排序已更新","settings.pathNotAllowed":"不能在该路径创建文件","syncProvider.unsupported":"不支持的同步方式","syncProvider.notConfigured":"同步方式未配置","syncProvider.noFolderPath":"未设置文件夹路径","syncProvider.folderNotExist":"文件夹不存在","syncProvider.folderAccessible":"文件夹可访问","syncProvider.localFileMissing":"本地文件不存在","syncProvider.noRemoteFile":"同步文件夹中未找到密码库","syncProvider.remoteEmpty":"远程文件为空","syncProvider.testOk":"连接成功","syncProvider.testFail":"连接失败: ","syncProvider.noServerFile":"服务器上未找到密码库","syncProvider.syncNeedsRelock":"同步完成，数据已更新","error.noStoragePath":"未设置存储路径","error.vaultLocked":"密码库未解锁","error.syncNotConfigured":"未配置同步","error.remoteEmpty":"远程文件为空","error.serverNotFound":"服务器上未找到密码库","error.folderNotSet":"未设置文件夹路径","error.decryptFail":"无法解密云端文件，密钥不匹配","error.noSyncConfig":"请先配置同步信息","error.unknown":"未知错误","app.title":"密码保管箱","app.trayShow":"显示主窗口","app.trayExit":"退出","app.closeTitle":"关闭 PassVault","app.minimizeToTray":"最小化到系统托盘","app.quitDirect":"直接退出","app.remember":"记住我的选择","gen.title":"密码生成器","gen.length":"长度:","gen.upper":"大写","gen.lower":"小写","gen.digits":"数字","gen.symbols":"符号","gen.generated":"密码已生成"};

  var currentLang = 'zh-CN';
  var extraDict = {}; // additional language dicts loaded later

  // Resolve key: current > extra > fallback > key itself
  function _dictGet(k) {
    if (extraDict[k] !== undefined) return extraDict[k];
    return FALLBACK[k];
  }

  function t(key, vars) {
    key = (key || '').replace(/\//g, '.');
    var text = _dictGet(key);
    if (text === undefined) return key;
    if (vars) {
      var v, k;
      for (k in vars) {
        if (Object.prototype.hasOwnProperty.call(vars, k)) {
          v = String(vars[k]);
          text = text.split('{' + k + '}').join(v);
        }
      }
    }
    return text;
  }

  function setLanguage(lang) {
    currentLang = lang;
    extraDict = {}; // will be restored on next reload
    applyI18n();
  }

  function applyI18n(root) {
    root = root || document;
    var els, i, key, tag;

    els = root.querySelectorAll('[data-i18n]');
    for (i = 0; i < els.length; i++) {
      key = els[i].getAttribute('data-i18n');
      tag = els[i].tagName;
      if (tag === 'INPUT' && (els[i].type === 'submit' || els[i].type === 'button')) els[i].value = t(key);
      else els[i].textContent = t(key);
    }
    els = root.querySelectorAll('[data-i18n-placeholder]');
    for (i = 0; i < els.length; i++) {
      els[i].placeholder = t(els[i].getAttribute('data-i18n-placeholder'));
    }
    els = root.querySelectorAll('[data-i18n-title]');
    for (i = 0; i < els.length; i++) {
      els[i].title = t(els[i].getAttribute('data-i18n-title'));
    }
  }

  function initLanguage(lang, dict) {
    if (lang) currentLang = lang;
    if (dict) extraDict = dict;
  }

  function getCurrentLang() { return currentLang; }

  window.t = t;
  window.setLanguage = setLanguage;
  window.applyI18n = applyI18n;
  window.initLanguage = initLanguage;
  window.getCurrentLang = getCurrentLang;

})();
