/* Copyright (C) 2026 MIORNING. SPDX-License-Identifier: GPL-3.0-only */
/* MIORNING Select — independently implemented in-page launcher.
 * Uses the supplied MS_ICON artwork. No Toy, membership or remote service.
 */
(() => {
  'use strict';
  const STORAGE_KEY = 'miorningSelectDock';
  const EDGES = ['left', 'right', 'top', 'bottom'];
  // The portrait's face ends at y=900 of the supplied 1448px artwork.
  // The body is clipped in portrait coordinates before the edge rotation.
  const ART_HEIGHT = 46;
  const HEAD_HEIGHT = ART_HEIGHT * 900 / 1448;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const CSS = `
:host{--ms-bg:#f4f3ed;--ms-panel:#fffdf7;--ms-text:#252d28;--ms-muted:#687268;--ms-line:#d9ddd1;--ms-accent:#b34f30;--ms-soft:#ecede4;--ms-accent-ink:#fffaf5;--ms-sage:#e3ebdc;--ms-sage-ink:#344a36;--ms-error:#a23d32;--ms-error-bg:#fff0eb;--ink:var(--ms-bg);--edge:var(--ms-line);--muted:var(--ms-muted);--lime:var(--ms-accent);--red:var(--ms-error);color:var(--ms-text);color-scheme:light}
:host([data-theme=dark]){--ms-bg:#191f1c;--ms-panel:#232b26;--ms-text:#eef0e6;--ms-muted:#b1baad;--ms-line:#424d43;--ms-accent:#eda582;--ms-soft:#303b32;--ms-accent-ink:#25211e;--ms-sage:#354c39;--ms-sage-ink:#e3eedc;--ms-error:#ffb7ac;--ms-error-bg:#4a2e29;color-scheme:dark}
:host button{background:var(--ms-panel);color:var(--ms-text);border-color:var(--ms-line)}
:host button:hover{background:var(--ms-soft)}:host button:active{background:var(--ms-sage)}
:host button.primary{background:var(--ms-accent);border-color:var(--ms-accent);color:var(--ms-accent-ink)}
:host button[aria-pressed=true]{background:var(--ms-sage);border-color:var(--ms-accent);color:var(--ms-sage-ink)}
:host button.danger{color:var(--ms-error)}:host input,:host select,:host textarea{background:var(--ms-panel);border-color:var(--ms-line);color:var(--ms-text)}
:host small,:host .muted{color:var(--ms-muted)}:host button:focus-visible,:host input:focus-visible,:host select:focus-visible,:host textarea:focus-visible,:host summary:focus-visible{outline:2px solid var(--ms-accent);outline-offset:3px}
:host .desk,:host .footer,:host .edit-panel{background:var(--ms-bg);border-color:var(--ms-line);color:var(--ms-text)}
:host .top,:host .toolbar,:host .transport,:host .card,:host .selectbar,:host .edit-clip{background:var(--ms-panel);border-color:var(--ms-line);color:var(--ms-text)}
:host .brand small,:host .status,:host .align-row,:host .strip-tools .quiet,:host .loading{color:var(--ms-muted)}
:host .letter{background:var(--ms-accent);color:var(--ms-accent-ink)}
:host .screen,:host .edit-preview video{background:#101512;color:#f6f8ef}
:host .screen .stamp{color:#f6f8ef;background:#101512cf}
:host .screen .fault{background:var(--ms-error-bg);color:var(--ms-error)}
:host .track,:host .track-area,:host .export-box,:host .card-edit{border-color:var(--ms-line)}
:host .card-edit,:host .help,:host .audio-panel{background:var(--ms-soft);color:var(--ms-text)}
:host .help kbd{background:var(--ms-panel);border-color:var(--ms-line);color:var(--ms-text)}
:host .notice{background:var(--ms-sage);color:var(--ms-sage-ink)}:host .notice.error{background:var(--ms-error-bg);color:var(--ms-error)}
:host .lane,:host .source-timeline{border-color:var(--ms-line);background:repeating-linear-gradient(90deg,var(--ms-line) 0,var(--ms-line) 1px,transparent 1px,transparent 10%)}
:host .clip,:host .track.audio .clip,:host .source-segment{background:var(--ms-sage);border-color:var(--ms-accent);color:var(--ms-sage-ink)}
:host .source-segment.chosen{background:var(--ms-sage);border-color:var(--ms-accent);box-shadow:0 0 0 1px var(--ms-accent)}
:host .edge:after{border-color:var(--ms-accent)}:host .edge:hover,:host .edge:focus-visible{background:var(--ms-soft);outline-color:var(--ms-accent)}
:host .playhead,:host .source-head{background:var(--ms-accent)}:host .queue-empty{border-color:var(--ms-line);color:var(--ms-muted)}
:host .outline{border-color:var(--ms-accent)}:host .outline span{background:var(--ms-accent);color:var(--ms-accent-ink)}

/* Original editor injects its own style later. Host-qualified selectors keep both themes coherent. */
:host .ms-sequence .sequence-preview{background:#101512;border-color:var(--ms-line)}
:host .ms-sequence .preview-empty{color:#cad3c4}
:host .ms-sequence #queue-count,:host .ms-sequence #export-status{color:var(--ms-accent)}
:host .ms-sequence .timeline-scroll{background:var(--ms-soft);border-color:var(--ms-line)}
:host .ms-sequence .sequence-clip,:host .ms-sequence .sequence-clip:nth-child(even){background:var(--ms-sage);border-color:var(--ms-accent);color:var(--ms-sage-ink)}
:host .ms-sequence .sequence-clip.active{outline-color:var(--ms-accent)}
:host .ms-sequence .sequence-clip.drop-target{outline-color:var(--ms-text)}
:host .ms-sequence .clip-start,:host .ms-sequence .timeline-help,:host .ms-sequence #preview-caption,:host .ms-sequence .timeline-empty{color:var(--ms-muted)}
:host .ms-sequence .clip-content strong,:host .ms-sequence .clip-content small{color:var(--ms-sage-ink)}
:host .ms-sequence .trim-handle{background:var(--ms-line)}:host .ms-sequence .trim-handle:after{background:var(--ms-accent)}
:host .ms-sequence .sequence-playhead{background:var(--ms-accent)}:host .ms-sequence .sequence-playhead:before{border-top-color:var(--ms-accent)}
:host .ms-sequence .sequence-clip:focus-visible,:host .ms-sequence .trim-handle:focus-visible,:host .ms-sequence input:focus-visible{outline-color:var(--ms-accent)}
.msd-cluster{--msd-art-w:34.5px;--msd-art-h:46px;--msd-head:28.59px;--msd-body:17.41px;position:fixed;z-index:2147483647;pointer-events:none;width:var(--msd-head);height:var(--msd-art-w);isolation:isolate}
.msd-cluster[data-edge=top],.msd-cluster[data-edge=bottom]{width:var(--msd-art-w);height:var(--msd-head)}
.msd-launch{position:absolute;inset:0;display:block;width:100%;height:100%;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;pointer-events:auto;touch-action:none;user-select:none;cursor:grab!important;overflow:visible}
.msd-launch:active{cursor:grabbing!important}.msd-launch:focus-visible{outline:2px solid var(--ms-accent);outline-offset:1px;border-radius:6px!important}
.msd-art{position:absolute;display:block;width:var(--msd-art-w);height:var(--msd-art-h);pointer-events:none;overflow:hidden;clip-path:inset(0 0 var(--msd-body) 0);transform-origin:0 0;transition:transform 160ms cubic-bezier(.18,.75,.25,1),clip-path 160ms cubic-bezier(.18,.75,.25,1)}
.msd-art img{display:block;width:100%;height:100%;max-width:none;object-fit:contain;user-select:none;pointer-events:none}
.msd-cluster[data-edge=right] .msd-art{left:0;top:var(--msd-art-w);transform:rotate(-90deg)}
.msd-cluster[data-edge=left] .msd-art{left:var(--msd-head);top:0;transform:rotate(90deg)}
.msd-cluster[data-edge=bottom] .msd-art{left:0;top:0;transform:translateY(0)}
.msd-cluster[data-edge=top] .msd-art{left:var(--msd-art-w);top:var(--msd-head);transform:rotate(180deg)}
.msd-cluster[data-revealed=true] .msd-art{clip-path:inset(0)}
.msd-cluster[data-edge=right][data-revealed=true] .msd-art{transform:translateX(calc(-1 * var(--msd-body))) rotate(-90deg)}
.msd-cluster[data-edge=left][data-revealed=true] .msd-art{transform:translateX(var(--msd-body)) rotate(90deg)}
.msd-cluster[data-edge=bottom][data-revealed=true] .msd-art{transform:translateY(calc(-1 * var(--msd-body)))}
.msd-cluster[data-edge=top][data-revealed=true] .msd-art{transform:translateY(var(--msd-body)) rotate(180deg)}
.msd-cluster[data-revealed=true] .msd-launch:before{content:'';position:absolute;inset:0}
.msd-cluster[data-edge=right][data-revealed=true] .msd-launch:before{left:calc(-1 * var(--msd-body))}
.msd-cluster[data-edge=left][data-revealed=true] .msd-launch:before{right:calc(-1 * var(--msd-body))}
.msd-cluster[data-edge=top][data-revealed=true] .msd-launch:before{bottom:calc(-1 * var(--msd-body))}
.msd-cluster[data-edge=bottom][data-revealed=true] .msd-launch:before{top:calc(-1 * var(--msd-body))}
.msd-cluster[data-paused=true] .msd-art{opacity:.62}.msd-cluster[data-paused=true][data-revealed=true] .msd-art{opacity:1}
.msd-cluster[data-dragging=true] .msd-art{transition:none}
.msd-menu{position:fixed;pointer-events:auto;width:204px;max-width:calc(100vw - 16px);padding:7px;background:var(--ms-panel);color:var(--ms-text);border:1px solid var(--ms-line);border-radius:12px;box-shadow:0 12px 42px #1520172b;overflow:auto;max-height:calc(100dvh - 16px)}
.msd-menu[hidden]{display:none!important}.msd-menu-title{display:flex;align-items:center;justify-content:space-between;padding:7px 8px 9px;border-bottom:1px solid var(--ms-line);margin-bottom:4px;font-size:11px;font-weight:650;letter-spacing:.2px}.msd-menu-title small{font-size:9px;letter-spacing:.6px}
.msd-menu button{display:flex;align-items:center;gap:10px;width:100%;min-height:35px;padding:7px 9px!important;border:0!important;border-radius:6px;background:transparent;color:var(--ms-text);text-align:left;white-space:nowrap;font:12px/1.35 "Segoe UI","Microsoft YaHei",sans-serif}
.msd-menu button:hover,.msd-menu button:focus-visible{background:var(--ms-soft)}.msd-menu button:focus-visible{outline-offset:-2px}
.msd-menu button[data-msd-action=pause]{border-top:1px solid var(--ms-line)!important;border-radius:0 0 6px 6px;margin-top:4px;padding-top:10px!important}
.msd-menu button[data-msd-action=pause][aria-pressed=true]{color:var(--ms-accent);background:var(--ms-soft)}
.msd-menu svg,.msd-header-theme svg{display:block;width:17px;height:17px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linejoin:round;stroke-linecap:round}
.msd-menu button small{margin-left:auto;font-size:10px;color:var(--ms-muted)}
.msd-header-theme{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:6px 9px!important;min-height:32px!important}
.msd-toast{position:fixed;z-index:2147483647;left:50%;bottom:20px;transform:translateX(-50%);max-width:calc(100vw - 32px);padding:10px 16px;border:1px solid var(--ms-line);border-radius:8px;background:var(--ms-panel);color:var(--ms-text);box-shadow:0 6px 24px #10151222;font-size:12px;pointer-events:none}
@media(prefers-reduced-motion:reduce){.msd-art{transition:none!important}.msd-menu,.msd-toast{animation:none!important}}
`;
  const icons = {
    select: '<path d="m5 3 3 17 4-6 7-2Z"/>',
    open: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
    import: '<path d="M12 16V3m-4 4 4-4 4 4M4 14v6h16v-6"/>',
    moon: '<path d="M20 14A9 9 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-1.5 1-2 1.5-2 3m0 3h.01"/>',
    shortcuts: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h1m4 0h1m4 0h1M6 13h1m4 0h1m4 0h1M8 16h8"/>',
    storage: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    resume: '<path d="m8 5 11 7-11 7Z"/>'
  };
  const svg = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';

  function create({ root, host, icon, onSelect, onOpen, onImport, onHelp, onPause, onShortcuts, onStorage }) {
    if (!root || !host) throw new TypeError('MSDock requires the existing shadow root and host.');
    const doc = host.ownerDocument;
    const view = doc.defaultView;
    const abort = new AbortController();
    const listen = (element, name, callback, options = {}) => element.addEventListener(name, callback, { ...options, signal: abort.signal });
    const element = (tag, className, text) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const style = element('style'); style.textContent = CSS;
    const cluster = element('div', 'msd-cluster');
    const launcher = element('button', 'msd-launch'); launcher.type = 'button';
    launcher.title = '喵咛选片台 · 点击菜单，拖动贴边';
    launcher.setAttribute('aria-label', '打开喵咛选片菜单');
    launcher.setAttribute('aria-haspopup', 'menu');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-keyshortcuts', 'Escape ArrowUp ArrowDown ArrowLeft ArrowRight');
    const art = element('span', 'msd-art'), picture = element('img');
    picture.alt = ''; picture.draggable = false;
    art.appendChild(picture); launcher.appendChild(art);
    const menu = element('div', 'msd-menu'); menu.hidden = true;
    menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', '喵咛选片快捷菜单');
    const title = element('div', 'msd-menu-title', '喵咛选片台'); title.appendChild(element('small', '', 'SELECT'));
    menu.appendChild(title);
    const toast = element('div', 'msd-toast'); toast.hidden = true; toast.setAttribute('role', 'status');
    cluster.append(launcher, menu); root.append(style, cluster, toast);
    let config = { version: 1, edge: 'right', position: .8, theme: 'light' };
    let opened = false, hovered = false, focused = false, keyboardFocus = false, paused = false, destroyed = false;
    let artWidth = ART_HEIGHT * .75;
    let gesture = null, suppressedUntil = 0, revision = 0, toastTimer = 0;
    let headerTheme = root.querySelector('#theme-toggle');
    const ownsHeader = !headerTheme;
    const menuButtons = new Map();

    function notify(message) {
      if (destroyed) return;
      toast.textContent = message; toast.hidden = false;
      view.clearTimeout(toastTimer); toastTimer = view.setTimeout(() => { toast.hidden = true; }, 3200);
    }
    function callback(fn, ...args) {
      try {
        const result = fn?.(...args);
        if (result?.catch) result.catch(error => notify(error?.message || '这次操作未完成，请重试。'));
      } catch (error) { notify(error?.message || '这次操作未完成，请重试。'); }
    }
    function storageSave() {
      revision += 1;
      try { globalThis.chrome?.storage?.local?.set({ [STORAGE_KEY]: { ...config } }, () => { void globalThis.chrome?.runtime?.lastError; }); } catch (_) {}
    }
    function dimensions() {
      const viewport = view.visualViewport;
      return { width: Math.max(1, viewport?.width || view.innerWidth), height: Math.max(1, viewport?.height || view.innerHeight), x: viewport?.offsetLeft || 0, y: viewport?.offsetTop || 0 };
    }
    function layout() {
      if (destroyed) return;
      const viewport = dimensions(), side = config.edge === 'left' || config.edge === 'right';
      const width = side ? HEAD_HEIGHT : artWidth, height = side ? artWidth : HEAD_HEIGHT;
      const x = config.edge === 'left' ? 0 : config.edge === 'right' ? viewport.width - width : config.position * Math.max(0, viewport.width - width);
      const y = config.edge === 'top' ? 0 : config.edge === 'bottom' ? viewport.height - height : config.position * Math.max(0, viewport.height - height);
      cluster.dataset.edge = config.edge;
      cluster.style.left = viewport.x + x + 'px'; cluster.style.top = viewport.y + y + 'px';
      if (!opened) return;
      const mw = Math.min(204, viewport.width - 16), mh = Math.min(menu.scrollHeight || 302, viewport.height - 16);
      let mx = side ? (config.edge === 'right' ? viewport.width - ART_HEIGHT - mw - 12 : ART_HEIGHT + 12) : x + width / 2 - mw / 2;
      let my = side ? y + height / 2 - mh / 2 : (config.edge === 'bottom' ? viewport.height - ART_HEIGHT - mh - 12 : ART_HEIGHT + 12);
      menu.style.left = viewport.x + clamp(mx, 8, Math.max(8, viewport.width - mw - 8)) + 'px';
      menu.style.top = viewport.y + clamp(my, 8, Math.max(8, viewport.height - mh - 8)) + 'px';
    }
    function reveal() {
      cluster.dataset.revealed = String(hovered || (keyboardFocus && root.activeElement === launcher) || !!gesture);
      cluster.dataset.paused = String(paused);
    }
    function openMenu() {
      if (destroyed) return;
      opened = true; menu.hidden = false; launcher.setAttribute('aria-expanded', 'true');
      launcher.setAttribute('aria-label', '收起喵咛选片菜单'); reveal(); layout();
    }
    function closeMenu(restoreFocus = false) {
      opened = false; menu.hidden = true; launcher.setAttribute('aria-expanded', 'false');
      launcher.setAttribute('aria-label', paused ? '选片已暂停，打开菜单恢复' : '打开喵咛选片菜单');
      if (restoreFocus) launcher.focus({ preventScroll: true });
      reveal();
    }
    function updatePause() {
      const button = menuButtons.get('pause');
      button.innerHTML = svg(paused ? 'resume' : 'pause') + '<span>' + (paused ? '恢复选片' : '暂停本页') + '</span>';
      button.setAttribute('aria-pressed', String(paused));
      launcher.title = paused ? '喵咛选片已暂停 · 点击菜单恢复' : '喵咛选片台 · 点击菜单，拖动贴边';
      reveal();
    }
    function resume() { if (paused) { paused = false; callback(onPause, false); updatePause(); } }
    function run(fn) { resume(); closeMenu(); callback(fn); }
    function addAction(action, iconName, text, handler, hint) {
      const button = element('button'); button.type = 'button'; button.dataset.msdAction = action;
      button.setAttribute('role', 'menuitem');
      button.innerHTML = svg(iconName) + '<span>' + text + '</span>' + (hint ? '<small>' + hint + '</small>' : '');
      listen(button, 'click', event => { event.stopPropagation(); handler(); });
      menu.appendChild(button); menuButtons.set(action, button); return button;
    }
    addAction('select', 'select', '点选素材', () => run(onSelect));
    addAction('open', 'open', '打开选片台', () => run(onOpen));
    addAction('import', 'import', '导入本地', () => run(onImport));
    addAction('theme', 'moon', '日夜模式', () => setTheme(config.theme === 'dark' ? 'light' : 'dark'), '免费');
    addAction('shortcuts', 'shortcuts', '快捷键设置', () => run(onShortcuts));
    addAction('storage', 'storage', '缓存管理', () => run(onStorage));
    addAction('help', 'help', '使用帮助', () => run(onHelp));
    addAction('pause', 'pause', '暂停本页', () => {
      paused = !paused; callback(onPause, paused); updatePause(); closeMenu();
      notify(paused ? '本页选片已暂停。黑猫菜单仍可恢复。' : '本页选片已恢复。');
    });
    if (!headerTheme) {
      headerTheme = element('button', 'msd-header-theme'); headerTheme.type = 'button'; headerTheme.id = 'theme-toggle';
      root.querySelector('.top')?.appendChild(headerTheme);
      listen(headerTheme, 'click', () => setTheme(config.theme === 'dark' ? 'light' : 'dark'));
    }
    function applyTheme() {
      host.dataset.theme = config.theme;
      const dark = config.theme === 'dark', label = dark ? '切换日间模式' : '切换夜间模式';
      menuButtons.get('theme').innerHTML = svg(dark ? 'sun' : 'moon') + '<span>日夜模式</span><small>' + (dark ? '夜间' : '日间') + '</small>';
      menuButtons.get('theme').setAttribute('aria-label', label + '，免费');
      menuButtons.get('theme').setAttribute('aria-pressed', String(dark));
      if (headerTheme) {
        headerTheme.classList.add('msd-header-theme');
        headerTheme.innerHTML = svg(dark ? 'sun' : 'moon') + '<span>日夜模式</span>';
        headerTheme.title = label + ' · 免费';
        headerTheme.setAttribute('aria-label', label + '，免费');
        headerTheme.setAttribute('aria-pressed', String(dark));
      }
      host.dispatchEvent(new CustomEvent('miorning-select-theme', { detail: { theme: config.theme } }));
    }
    function setTheme(theme) {
      if (destroyed) return;
      config.theme = theme === 'dark' ? 'dark' : 'light'; applyTheme(); storageSave();
    }
    function normalize(saved) {
      return { version: 1, edge: EDGES.includes(saved?.edge) ? saved.edge : 'right', position: Number.isFinite(saved?.position) ? clamp(saved.position, 0, 1) : .8, theme: saved?.theme === 'dark' ? 'dark' : 'light' };
    }
    listen(launcher, 'click', event => {
      event.preventDefault(); event.stopPropagation();
      if (event.detail !== 0 && Date.now() < suppressedUntil) return;
      if (opened) closeMenu(); else openMenu();
    });
    listen(launcher, 'dragstart', event => event.preventDefault());
    listen(launcher, 'pointerenter', () => { hovered = true; reveal(); });
    listen(launcher, 'pointerleave', () => { hovered = false; reveal(); });
    listen(cluster, 'focusin', event => { focused = true; keyboardFocus = event.target === launcher && launcher.matches(':focus-visible'); reveal(); });
    listen(cluster, 'focusout', event => {
      // relatedTarget is already known while the browser is between the two
      // focus events. A microtask here can see no active element and hide a
      // menu button before its click is delivered.
      if (event.relatedTarget) {
        focused = cluster.contains(event.relatedTarget); reveal();
        if (!focused && opened) closeMenu();
      } else view.setTimeout(() => {
        if (destroyed) return;
        focused = cluster.contains(root.activeElement); reveal();
        if (!focused && opened) closeMenu();
      }, 0);
    });
    listen(launcher, 'pointerdown', event => {
      if (event.button !== 0 || event.isPrimary === false) return;
      event.stopPropagation();
      keyboardFocus = false;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, saved: { ...config } };
      try { launcher.setPointerCapture(event.pointerId); } catch (_) {}
      reveal();
    });
    listen(launcher, 'pointermove', event => {
      if (!gesture || gesture.id !== event.pointerId) return;
      if (!gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 5) return;
      event.preventDefault(); event.stopPropagation(); gesture.moved = true;
      closeMenu(); cluster.dataset.dragging = 'true';
      const viewport = dimensions(), x = clamp(event.clientX - viewport.x, 0, viewport.width), y = clamp(event.clientY - viewport.y, 0, viewport.height);
      const distances = [x, viewport.width - x, y, viewport.height - y];
      config.edge = EDGES[distances.indexOf(Math.min(...distances))];
      config.position = config.edge === 'left' || config.edge === 'right'
        ? clamp((y - artWidth / 2) / Math.max(1, viewport.height - artWidth), 0, 1)
        : clamp((x - artWidth / 2) / Math.max(1, viewport.width - artWidth), 0, 1);
      layout(); reveal();
    });
    function endGesture(event, cancelled) {
      if (!gesture || gesture.id !== event.pointerId) return;
      const finished = gesture; gesture = null; cluster.dataset.dragging = 'false';
      if (finished.moved) {
        suppressedUntil = Date.now() + 450;
        if (cancelled) config = finished.saved; else storageSave();
      }
      try { if (launcher.hasPointerCapture(event.pointerId)) launcher.releasePointerCapture(event.pointerId); } catch (_) {}
      layout(); reveal();
    }
    listen(launcher, 'pointerup', event => endGesture(event, false));
    listen(launcher, 'pointercancel', event => endGesture(event, true));
    listen(launcher, 'lostpointercapture', event => { if (gesture) endGesture(event, true); });
    listen(cluster, 'keydown', event => {
      keyboardFocus = event.target === launcher; reveal();
      if (globalThis.MSShortcuts ? MSShortcuts.match(event, 'close') : event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenu(true); return; }
      const buttons = [...menuButtons.values()];
      if (opened && event.target !== launcher && ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        const index = buttons.indexOf(root.activeElement);
        buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
        return;
      }
      if (event.target !== launcher) return;
      if (event.key === 'Enter' || event.key === ' ') return;
      if (event.key === 'ArrowDown' && opened) { event.preventDefault(); buttons[0].focus(); return; }
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const directions = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'top', ArrowDown: 'bottom' };
      if (event.altKey && directions[event.key]) config.edge = directions[event.key];
      else if (event.key === 'Home' || event.key === 'End') config.position = event.key === 'Home' ? 0 : 1;
      else config.position = clamp(config.position + (event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? .1 : .025), 0, 1);
      storageSave(); layout();
    });
    listen(doc, 'pointerdown', event => { if (opened && !event.composedPath().includes(cluster)) closeMenu(); }, { capture: true });
    listen(view, 'resize', layout, { passive: true });
    if (view.visualViewport) {
      listen(view.visualViewport, 'resize', layout, { passive: true });
      listen(view.visualViewport, 'scroll', layout, { passive: true });
    }
    const onStorageChange = (changes, area) => {
      if (destroyed || area !== 'local' || !changes[STORAGE_KEY]?.newValue || gesture) return;
      config = normalize(changes[STORAGE_KEY].newValue); applyTheme(); layout();
    };
    try {
      globalThis.chrome?.storage?.onChanged?.addListener(onStorageChange);
      const initialRevision = revision;
      globalThis.chrome?.storage?.local?.get(STORAGE_KEY, values => {
        void globalThis.chrome?.runtime?.lastError;
        if (destroyed || revision !== initialRevision || !values?.[STORAGE_KEY]) return;
        config = normalize(values[STORAGE_KEY]); applyTheme(); layout();
      });
    } catch (_) {}
    function measureArtwork() {
      if (destroyed || !picture.naturalWidth || !picture.naturalHeight) return;
      artWidth = ART_HEIGHT * picture.naturalWidth / picture.naturalHeight;
      cluster.style.setProperty('--msd-art-w', artWidth + 'px');
      layout();
    }
    cluster.style.setProperty('--msd-art-h', ART_HEIGHT + 'px');
    cluster.style.setProperty('--msd-head', HEAD_HEIGHT + 'px');
    cluster.style.setProperty('--msd-body', ART_HEIGHT - HEAD_HEIGHT + 'px');
    listen(picture, 'load', measureArtwork);
    picture.src = icon || globalThis.MS_ICON || '';
    if (picture.complete) measureArtwork();
    applyTheme(); updatePause(); reveal(); layout();
    return Object.freeze({
      openMenu, closeMenu, setTheme, getTheme: () => config.theme,
      destroy() {
        if (destroyed) return;
        destroyed = true; abort.abort(); view.clearTimeout(toastTimer);
        try { globalThis.chrome?.storage?.onChanged?.removeListener(onStorageChange); } catch (_) {}
        cluster.remove(); toast.remove(); style.remove();
        if (ownsHeader) headerTheme?.remove();
      }
    });
  }
  globalThis.MSDock = Object.freeze({ create });
})();
