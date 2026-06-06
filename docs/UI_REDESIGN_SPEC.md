# PassVault 主界面视觉重构规范

> 基于 2026-06-06 截图分析，目标：现代桌面软件风格 — 简洁、专业、干净

---

## 一、色彩体系 (Light Mode)

```
层级:
  --bg-page:         #F0F0F3   页面背景（最底层，带微弱质感）
  --bg-surface:      #FFFFFF   主面板背景（侧边栏 + 内容区整体）
  --bg-raised:       #FAFAFC   微凸起卡片（分组头、底部栏）
  --bg-hover:        #F2F2F7   行 hover / 按钮 hover
  --bg-active:       #E8E8F4   选中态（侧边栏/搜索按钮）

主色:
  --color-primary:           #5B5FC7  蓝紫主色（按钮填充、链接、选中标记）
  --color-primary-hover:     #4A4EB5
  --color-primary-light:     #EEEBFF  主色浅底（侧边栏选中 bg、tag）

文字:
  --text-primary:     #1B1B1F  主文字（标题、行文本）
  --text-secondary:   #5E5E6E  次要文字（别名、账号、描述、计数）
  --text-tertiary:    #9B9BAB  提示/占位
  --text-inverse:     #FFFFFF  浅色底上的白色文字

边框:
  --border-light:     #E8E8EE  默认分割线
  --border-medium:    #D4D4DE  强调分割线
  --border-input:     #C8C8D4  输入框边框
```

### 暗色模式 (后备)

```
--bg-page:         #1A1A20
--bg-surface:      #24242E
--bg-raised:       #2E2E3A
--bg-hover:        #32323E
--bg-active:       #3A3A4E
--text-primary:    #EAEAF0
--text-secondary:  #9E9EB4
--text-tertiary:   #6A6A80
--border-light:    #363648
--border-medium:   #48485C
```

---

## 二、字体规格

| 用途 | 字体 | 大小 | 字重 | 行高 |
|------|------|------|------|------|
| 页面标题 | system-ui | 15px | 600 | 1.4 |
| 侧边栏分类标签 | system-ui | 11px | 500 | 1.4 |
| 侧边栏条目 | system-ui | 13px | 400/500 | 1.4 |
| 侧边栏计数徽章 | system-ui | 11px | 500 | 1.0 |
| 搜索输入 | system-ui | 13px | 400 | 1.4 |
| 搜索按钮 | system-ui | 12px | 500 | 1.0 |
| 表头 | system-ui | 11px | 500 | 1.0 |
| 表格行 | system-ui | 13px | 400 | 1.4 |
| 分组标题 | system-ui | 12px | 600 | 1.0 |
| 底部状态 | system-ui | 12px | 400 | 1.4 |

系统字体栈: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif`

---

## 三、各区域详细规范

### 3.1 整体布局

```
┌─────────────────────────────────────────┐
│  ┌──────┬───────────────────────────┐   │ ← bg-page (#F0F0F3)
│  │      │ header (48px)             │   │
│  │ side ├───────────────────────────┤   │ ← bg-surface (#FFFFFF)
│  │ bar  │ search bar (44px)         │   │
│  │ 240px├───────────────────────────┤   │
│  │      │                           │   │
│  │      │ table area                │   │
│  │      │  (scrollable, flex:1)     │   │
│  │      │                           │   │
│  │      ├───────────────────────────┤   │
│  │      │ footer (36px)             │   │
│  └──────┴───────────────────────────┘   │
└─────────────────────────────────────────┘

关键变更:
- 侧边栏从 ~180px → 240px
- 整体用一张白色矩形卡片包裹（侧边栏+内容区），不透明度分界
- 侧边栏右侧 1px 分割线 #E8E8EE
- 四周 padding: 8px（让 bg-page 露出边缘）
```

### 3.2 侧边栏

**HTML 结构变更:**
```html
<nav class="main-sidebar">
  <div class="sidebar-section">
    <div class="sidebar-label">密码库</div>
    <div class="sidebar-divider"></div>
    <div class="vault-list" id="main-vault-list">
      <!-- JS 生成 -->
    </div>
  </div>
  <div class="sidebar-footer">
    <button class="sidebar-settings-btn" id="main-settings-btn">
      ⚙ 设置
    </button>
  </div>
</nav>
```

**每个 vault item 的 HTML:**
```html
<div class="vault-item active" data-vault-id="all">
  <span class="vault-icon">📁</span>
  <span class="vault-name">全部</span>
  <span class="vault-count">7</span>
</div>
```

**CSS 关键值:**
```css
.main-sidebar {
  width: 240px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-light);
}

.sidebar-label {
  padding: 14px 16px 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.vault-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  margin: 1px 8px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s;
}

.vault-item:hover {
  background: var(--bg-hover);
}

.vault-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.vault-icon {
  font-size: 15px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.vault-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vault-count {
  font-size: 11px;
  font-weight: 500;
  background: var(--bg-active);
  color: var(--text-secondary);
  padding: 2px 7px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.vault-item.active .vault-count {
  background: var(--color-primary);
  color: #FFF;
}
```

### 3.3 顶部标题栏

**HTML:**
```html
<header class="main-header">
  <h1 class="header-title">密码保管箱</h1>
  <div class="header-actions">
    <button class="btn btn-header" id="main-lock-btn">
      <span class="btn-icon">🔒</span> 锁定
    </button>
    <button class="btn btn-header-primary" id="main-add-btn">
      <span class="btn-icon">+</span> 添加
    </button>
  </div>
</header>
```

**CSS 关键值:**
```css
.main-header {
  height: 48px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-surface);
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* 锁定按钮 — 白底边框风格 */
.btn-header {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  border: 1px solid var(--border-medium);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-header:hover {
  background: var(--bg-hover);
  border-color: var(--text-tertiary);
}

/* 添加按钮 — 主色填充 */
.btn-header-primary {
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 500;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  color: #FFF;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-header-primary:hover {
  background: var(--color-primary-hover);
}
```

### 3.4 搜索栏

**HTML:**
```html
<div class="search-bar">
  <div class="search-input-wrap">
    <svg class="search-icon" ...> <!-- 放大镜 SVG 14x14 --> </svg>
    <input type="text" id="main-search" class="search-input" placeholder="搜索密码...">
  </div>
  <div class="search-segment">
    <button class="segment-btn active" data-field="website">网站</button>
    <button class="segment-btn active" data-field="alias">别称</button>
    <button class="segment-btn active" data-field="account">账号</button>
    <button class="segment-btn" data-field="password">密码</button>
  </div>
  <label class="search-global">
    <input type="checkbox" id="search-global"> 全局
  </label>
</div>
```

**CSS 关键值:**
```css
.search-bar {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-surface);
}

.search-input-wrap {
  position: relative;
  flex: 1;
  max-width: 280px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
}

.search-input {
  width: 100%;
  height: 30px;
  padding: 0 12px 0 30px;
  font-size: 13px;
  border: 1px solid var(--border-input);
  border-radius: 6px;
  background: var(--bg-raised);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(91, 95, 199, 0.15);
}

/* Segment Control — 四合一按钮组 */
.search-segment {
  display: flex;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  overflow: hidden;
}

.segment-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  border: none;
  border-right: 1px solid var(--border-light);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}

.segment-btn:last-child {
  border-right: none;
}

.segment-btn.active {
  background: var(--bg-active);
  color: var(--color-primary);
}

.segment-btn:hover:not(.active) {
  background: var(--bg-hover);
}

.search-global {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}
```

### 3.5 表格区域

**最大的改动点。** 当前是 flex-row 模拟表格，列宽不够精确。

**HTML:**
```html
<div class="table-container" id="main-table-wrap">
  <!-- 表头 -->
  <div class="table-header">
    <div class="th-drag"></div>
    <div class="th-id">ID</div>
    <div class="th-website">网站</div>
    <div class="th-alias">别称</div>
    <div class="th-account">账号</div>
    <div class="th-password">密码</div>
    <div class="th-desc">描述</div>
    <div class="th-copy"></div>
  </div>

  <!-- 分组（重复） -->
  <div class="table-group" data-vault-id="default">
    <div class="group-header" onclick="toggleGroup(this)">
      <span class="group-chevron">▾</span>
      <span class="group-name">默认</span>
      <span class="group-count">3 条</span>
    </div>
    <!-- 行（重复） -->
    <div class="table-row" data-id="xxx">
      <div class="td-drag">⠿</div>
      <div class="td-id">1</div>
      <div class="td-website">🌐 google.com</div>
      <div class="td-alias">Google</div>
      <div class="td-account">
        <span>admin</span>
        <button class="row-copy-btn" title="复制">📋</button>
      </div>
      <div class="td-password">
        <span class="pw-dots">••••••</span>
        <button class="row-eye-btn" title="显示">👁</button>
        <button class="row-copy-btn" title="复制">📋</button>
      </div>
      <div class="td-desc">-</div>
      <div class="td-actions"></div>
    </div>
  </div>
</div>
```

**列宽定义 (精确 px + flex):**
```css
.th-drag,  .td-drag  { width: 20px; flex-shrink: 0; }
.th-id,    .td-id    { width: 36px; flex-shrink: 0; text-align: center; }
.th-website,.td-website { flex: 2.0; min-width: 100px; }
.th-alias, .td-alias   { flex: 1.5; min-width: 80px; }
.th-account,.td-account { flex: 1.5; min-width: 80px; }
.th-password,.td-password { flex: 1.0; min-width: 90px; }
.th-desc,  .td-desc   { flex: 2.0; min-width: 80px; }
.th-copy,  .td-actions { width: 30px; flex-shrink: 0; }
```

**表头样式:**
```css
.table-header {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  background: var(--bg-raised);
  border-bottom: 1px solid var(--border-medium);
  position: sticky;
  top: 0;
  z-index: 10;
}

.table-header > div {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: pointer;
  user-select: none;
  padding: 0 4px;
}

.table-header > div:hover {
  color: var(--text-secondary);
}
```

**分组头样式:**
```css
.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px 0 16px;
  background: var(--bg-raised);
  border-bottom: 1px solid var(--border-light);
  border-left: 3px solid var(--color-primary);
  cursor: pointer;
  user-select: none;
  transition: background 0.12s;
}

.group-header:hover {
  background: var(--bg-hover);
}

.group-header.collapsed + .table-row {
  display: none;
}

.group-chevron {
  font-size: 10px;
  color: var(--text-tertiary);
  transition: transform 0.15s;
  width: 12px;
  text-align: center;
}

.group-header.collapsed .group-chevron {
  transform: rotate(-90deg);
}

.group-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.group-count {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 400;
}
```

**数据行样式:**
```css
.table-row {
  display: flex;
  align-items: center;
  height: 34px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.1s;
}

.table-row:nth-child(even of .table-row) {
  background: rgba(0,0,0,0.012);
}

.table-row:hover {
  background: var(--bg-hover) !important;
}

.table-row > div {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
}

.td-id {
  font-size: 11px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.td-website {
  color: var(--color-primary);
  font-weight: 500;
}

.td-alias, .td-account, .td-desc {
  color: var(--text-secondary);
}

/* 行内按钮 — hover 行才出现 */
.row-copy-btn, .row-eye-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 11px;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  color: var(--text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s, border-color 0.12s;
}

.table-row:hover .row-copy-btn,
.table-row:hover .row-eye-btn {
  opacity: 1;
}

.row-copy-btn:hover, .row-eye-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* 密码列按需显示 */
.td-password {
  display: flex;
  align-items: center;
  gap: 2px;
}

.pw-dots {
  letter-spacing: 2px;
  color: var(--text-secondary);
}
```

### 3.6 底部状态栏

**HTML:**
```html
<footer class="main-footer">
  <span class="footer-count">
    <span id="main-count">7</span> 条记录
  </span>
  <div class="footer-sync">
    <span class="sync-dot unsynced"></span>
    <span class="sync-text">未配置同步</span>
    <button class="sync-btn" id="main-sync-btn">立即同步</button>
  </div>
</footer>
```

**CSS 关键值:**
```css
.main-footer {
  height: 36px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-raised);
  border-top: 1px solid var(--border-light);
}

.footer-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.footer-sync {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #CCC;
}

.sync-dot.synced { background: #34C759; }
.sync-dot.unsaved { background: #FF9500; }
.sync-dot.unsynced { background: #CCC; }

.sync-text {
  font-size: 12px;
  color: var(--text-tertiary);
}

.sync-btn {
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 500;
  background: transparent;
  border: 1px solid var(--border-medium);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.12s;
}

.sync-btn:hover {
  background: var(--bg-hover);
  color: var(--color-primary);
  border-color: var(--color-primary);
}
```

### 3.7 微交互

```css
/* 页面过渡 */
.page {
  opacity: 0;
  transition: opacity 0.15s;
}

.page.active {
  opacity: 1;
}

/* 按钮通用 hover 动画 */
.btn {
  transition: all 0.12s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 侧边栏条目选择动效 */
.vault-item {
  transition: background 0.12s, color 0.12s;
}

/* 聚焦环统一样式 */
input:focus-visible,
button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(91, 95, 199, 0.25);
}

/* 圆角统一 */
--radius-sm:  4px;    /* 徽章、小按钮 */
--radius-md:  6px;    /* 输入框、选项卡、侧边栏条目 */
--radius-lg:  8px;    /* 面板、卡片、模态框 */

/* 间距系统 */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 20px;
--space-2xl: 24px;
```

---

## 四、HTML 结构变更总结

| 文件 | 变更 |
|------|------|
| `index.html` | 侧边栏结构重写；header 结构简化；搜索栏调整；table 区域用 `.table-container > .table-group > .table-row`；footer 重构 |
| `main.css` | 完全重写，基于本规范色板+间距系统 |
| `base.css` | 更新 CSS 变量定义，加入三层背景体系 |
| `table.js` | `renderTable` 适配新的 `.table-group` 分组结构 |
| `main.js` | 侧边栏渲染适配新 HTML 结构 |

---

## 五、实施顺序

1. **Phase 1 — 色板落地** (base.css)
   - 更新所有 CSS 变量
   - 加入三层背景体系

2. **Phase 2 — 侧边栏** (index.html + main.css/table.js)
   - 重写侧边栏 HTML
   - 适配 vault item 带计数徽章
   - 更新设置按钮样式

3. **Phase 3 — 表格重构** (index.html + main.css + table.js)
   - `.table-group` + `.table-row` 结构
   - 分组头的左侧色条 + 折叠
   - 列宽精确到 px + flex
   - 行内按钮 hover 显示

4. **Phase 4 — 搜索栏 UI** (index.html + main.css)
   - segment control 替代散落按钮
   - 搜索图标嵌入输入框

5. **Phase 5 — 顶栏+底栏** (index.html + main.css)
   - header 48px 紧凑化
   - footer 同步状态可视化

6. **Phase 6 — 微交互与 polish**
   - 聚焦环统一
   - 过渡动画
   - 暗色模式适配
