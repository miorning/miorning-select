/* Copyright (C) 2026 MIORNING. SPDX-License-Identifier: GPL-3.0-only */
/* Application shortcuts only. Browser extension commands stay in browser settings. */
(() => {
  'use strict';
  if (globalThis.MSShortcuts) return;
  const KEY = 'miorningSelectShortcuts';
  const binding = (key, modifiers = {}) => ({ key, ctrl: false, alt: false, shift: false, meta: false, ...modifiers });
  const arrows = (key, modifiers) => binding(key, modifiers);
  const actions = [
    ['select', '点选页面视频', '全局', ['global'], [binding('v', { alt: true, shift: true })]],
    ['toggleDesk', '打开 / 收起选片台', '全局', ['global'], [binding('m', { alt: true, shift: true })]],
    ['close', '关闭当前视图', '全局', ['global'], [binding('Escape')]],
    ['play', '播放 / 暂停', '审片与剪辑', ['transport', 'editor', 'trim'], [binding('Space')]],
    ['seekBack', '后退 0.1 秒', '审片', ['transport'], [arrows('ArrowLeft')]],
    ['seekForward', '前进 0.1 秒', '审片', ['transport'], [arrows('ArrowRight')]],
    ['seekBackLarge', '后退 1 秒', '审片', ['transport'], [arrows('ArrowLeft', { shift: true })]],
    ['seekForwardLarge', '前进 1 秒', '审片', ['transport'], [arrows('ArrowRight', { shift: true })]],
    ['split', '分割片段', '剪辑', ['editor'], [binding('s')]],
    ['delete', '移除所选片段', '剪辑', ['editor'], [binding('Delete'), binding('Backspace')]],
    ['reorderPrev', '片段向前排序', '卡片与剪辑', ['cards', 'editor'], [arrows('ArrowLeft', { alt: true }), arrows('ArrowUp', { alt: true })]],
    ['reorderNext', '片段向后排序', '卡片与剪辑', ['cards', 'editor'], [arrows('ArrowRight', { alt: true }), arrows('ArrowDown', { alt: true })]],
    ['trimPrev', '裁切边界后退', '裁切手柄', ['trim'], [arrows('ArrowLeft')]],
    ['trimNext', '裁切边界前进', '裁切手柄', ['trim'], [arrows('ArrowRight')]],
    ['trimPrevFine', '裁切边界微调后退', '裁切手柄', ['trim'], [arrows('ArrowLeft', { shift: true })]],
    ['trimNextFine', '裁切边界微调前进', '裁切手柄', ['trim'], [arrows('ArrowRight', { shift: true })]],
    ['confirm', '确认片段 / 定位所选片段', '片段与裁切', ['cards', 'trim', 'trimDialog', 'editor'], [binding('Enter')]]
  ].map(([id, title, group, scopes, defaults]) => ({ id, title, group, scopes, defaults }));
  const table = new Map(actions.map(a => [a.id, a]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const defaults = () => Object.fromEntries(actions.map(a => [a.id, clone(a.defaults)]));
  let bindings = defaults(), settings = null, recording = null;
  const listeners = new Set();
  const normalizeKey = key => ({ ' ': 'Space', Spacebar: 'Space', Esc: 'Escape', Return: 'Enter' }[key] || (String(key).length === 1 ? String(key).toLowerCase() : String(key)));
  function normalize(value) {
    if (!value || typeof value !== 'object' || typeof value.key !== 'string') return null;
    const key = normalizeKey(value.key);
    if (!key || key.length > 32 || ['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Dead', 'Process', 'Unidentified'].includes(key)) return null;
    return binding(key, { ctrl: !!(value.ctrl ?? value.ctrlKey), alt: !!(value.alt ?? value.altKey), shift: !!(value.shift ?? value.shiftKey), meta: !!(value.meta ?? value.metaKey) });
  }
  function sanitize(value) {
    const result = defaults();
    if (value?.version !== 1 || !value.bindings || typeof value.bindings !== 'object') return result;
    for (const a of actions) if (Array.isArray(value.bindings[a.id])) result[a.id] = value.bindings[a.id].map(normalize).filter(Boolean).slice(0, 4);
    return result;
  }
  const signature = b => [b.ctrl, b.alt, b.shift, b.meta, b.key].join('|');
  const same = (a, b) => signature(a) === signature(b);
  const displayKey = key => ({ Space: '空格', Escape: 'Esc', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Backspace: '退格', Delete: 'Delete', Enter: 'Enter' }[key] || (key.length === 1 ? key.toUpperCase() : key));
  const format = b => [b.ctrl && 'Ctrl', b.alt && 'Alt', b.shift && 'Shift', b.meta && 'Meta', displayKey(b.key)].filter(Boolean).join(' + ');
  const label = id => (bindings[id] || []).map(format).join(' / ') || '已禁用';
  function emit() { for (const fn of listeners) { try { fn(clone(bindings)); } catch (_) {} } }
  function getStored() {
    return new Promise(resolve => {
      try { if (!globalThis.chrome?.storage?.local) return resolve(null); chrome.storage.local.get(KEY, value => { void chrome.runtime?.lastError; resolve(value?.[KEY] || null); }); }
      catch (_) { resolve(null); }
    });
  }
  const ready = getStored().then(value => { bindings = sanitize(value); emit(); });
  function persist(next) {
    return new Promise((resolve, reject) => {
      try {
        if (!globalThis.chrome?.storage?.local) return reject(new Error('扩展存储不可用，请重新加载扩展和页面。'));
        chrome.storage.local.set({ [KEY]: { version: 1, bindings: next } }, () => {
          const error = chrome.runtime?.lastError;
          if (error) return reject(new Error(error.message || '快捷键保存失败。'));
          bindings = clone(next); emit(); resolve({ ok: true });
        });
      } catch (error) { reject(error); }
    });
  }
  try { chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && Object.hasOwn(changes, KEY)) { bindings = sanitize(changes[KEY].newValue); emit(); } }); } catch (_) {}
  function conflicts(id, candidates, current = bindings) {
    const action = table.get(id); if (!action) return [];
    return actions.filter(other => other.id !== id && (action.scopes.includes('global') || other.scopes.includes('global') || action.scopes.some(scope => other.scopes.includes(scope))) && candidates.some(candidate => (current[other.id] || []).some(b => same(b, candidate)))).map(a => ({ id: a.id, title: a.title }));
  }
  function reserved(b) {
    return (b.alt && b.key === 'F4') || ((b.ctrl || b.meta) && ['l', 'r', 'w', 't', 'n', 'q', 'Tab'].includes(b.key)) || b.key === 'F5' || b.key === 'F11' || b.key === 'F12';
  }
  async function setBinding(id, value) {
    await ready;
    if (!table.has(id)) return { ok: false, error: '未知快捷键动作。' };
    const values = value == null ? [] : Array.isArray(value) ? value : [value], next = values.map(normalize);
    if (next.some(b => !b) || next.length > 4) return { ok: false, error: '请录制一个有效按键；Tab 留给基础焦点导航。' };
    if (next.some(reserved)) return { ok: false, error: '这个组合通常由浏览器或系统使用，请选择其他按键。' };
    const stored = await getStored(), current = stored ? sanitize(stored) : clone(bindings), found = conflicts(id, next, current);
    if (found.length) return { ok: false, conflicts: found, error: '与「' + found.map(a => a.title).join('」「') + '」冲突，请换一个组合。' };
    current[id] = next; return persist(current);
  }
  async function reset() { await ready; return persist(defaults()); }
  async function disableAll() { await ready; return persist(Object.fromEntries(actions.map(a => [a.id, []]))); }
  function match(event, id, { allowInput = false } = {}) {
    if (!table.has(id) || event.defaultPrevented || event.isComposing || recording || settings?.isOpen()) return false;
    const target = event.composedPath?.()[0] || event.target;
    if (!allowInput && target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')) return false;
    const b = normalize({ key: event.key, ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey, meta: event.metaKey });
    if (!b) return false;
    // Native button/link activation stays available even when every app binding is disabled.
    if (['Space', 'Enter'].includes(b.key) && target?.closest?.('button,a[href],[role="button"],summary')) return false;
    return (bindings[id] || []).some(candidate => same(candidate, b));
  }
  const CSS = `
:host([data-mss-open=true]) .msd-cluster{visibility:hidden;pointer-events:none}.mss-overlay{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:18px;background:#111a1766;pointer-events:auto;color:var(--ms-text);font:13px/1.5 "Segoe UI","Microsoft YaHei",sans-serif}.mss-overlay[hidden]{display:none!important}.mss-dialog{width:min(850px,100%);max-height:calc(100dvh - 36px);display:flex;flex-direction:column;border:1px solid var(--ms-line);border-radius:15px;background:var(--ms-panel);box-shadow:0 20px 70px #101a1640;overflow:hidden}.mss-head,.mss-foot{padding:15px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--ms-line)}.mss-head h2{font-size:17px;margin:0;flex:1}.mss-dialog button{font:inherit;border:1px solid var(--ms-line);border-radius:7px;padding:7px 10px;cursor:pointer;min-height:34px}.mss-dialog button:disabled{opacity:.45;cursor:default}.mss-head button{padding:5px 10px}.mss-body{overflow:auto;padding:0 20px 18px;overscroll-behavior:contain}.mss-intro{color:var(--ms-muted);margin:14px 0}.mss-status{padding:10px 12px;background:var(--ms-sage);border-radius:7px;color:var(--ms-sage-ink);margin:10px 0;min-height:20px}.mss-status.error{background:var(--ms-error-bg);color:var(--ms-error)}.mss-row{display:grid;grid-template-columns:minmax(145px,1fr) minmax(145px,1.25fr) auto;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid var(--ms-line)}.mss-row strong{font-weight:600;display:block}.mss-row small{font-size:11px;color:var(--ms-muted)}.mss-binding{display:flex;flex-direction:column;gap:5px}.mss-binding kbd{font:12px/1.5 ui-monospace,monospace;white-space:normal;overflow-wrap:anywhere;color:var(--ms-text)}.mss-row[data-recording=true]{background:var(--ms-sage);outline:2px solid var(--ms-accent);outline-offset:3px}.mss-row-actions{display:flex;gap:6px;flex-wrap:wrap}.mss-row-actions button{font-size:12px;padding:6px 9px}.mss-draft{color:var(--ms-accent);font-size:11px}.mss-foot{border-top:1px solid var(--ms-line);border-bottom:0;justify-content:space-between;flex-wrap:wrap}.mss-browser{margin-top:18px;background:var(--ms-soft);border:1px solid var(--ms-line);border-radius:9px;padding:12px}.mss-browser h3{margin:0 0 6px;font-size:13px}.mss-browser p{margin:5px 0;color:var(--ms-muted)}.mss-browser code{user-select:text;overflow-wrap:anywhere}.mss-browser button{margin-top:8px}.mss-tip{font-size:11px;color:var(--ms-muted);margin:9px 0}.mss-dialog button:focus-visible{outline:2px solid var(--ms-accent);outline-offset:2px}@media(max-width:600px){.mss-overlay{padding:7px}.mss-dialog{max-height:calc(100dvh - 14px)}.mss-head,.mss-foot{padding:12px}.mss-body{padding:0 12px 12px}.mss-row{grid-template-columns:1fr 1fr;gap:6px}.mss-row-actions{grid-column:1/-1;justify-content:flex-end}.mss-row strong{font-size:12px}}@media(prefers-reduced-motion:reduce){.mss-overlay *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;
  function createSettings({ root, host, notice = () => {}, onOpenBrowserShortcuts } = {}) {
    if (!root || !host) throw new TypeError('MSShortcuts settings requires a shadow root and host.');
    if (settings) return settings;
    const doc = host.ownerDocument, view = doc.defaultView, style = doc.createElement('style'); style.textContent = CSS;
    const overlay = doc.createElement('div'); overlay.className = 'mss-overlay'; overlay.hidden = true;
    const browserUrl = /Edg\//.test(navigator.userAgent) ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts';
    overlay.innerHTML = `<section class="mss-dialog" role="dialog" aria-modal="true" aria-labelledby="mss-title"><header class="mss-head"><h2 id="mss-title">快捷键设置</h2><button type="button" data-mss="close" aria-label="关闭快捷键设置">×</button></header><div class="mss-body"><p class="mss-intro">录制组合后点「保存」。网页应用快捷键会同步到此浏览器的其他标签页；输入文字时保留编辑行为，关闭视图键仍可退出。Tab、按钮的 Enter / 空格等基础导航保持原样。</p><div class="mss-status" role="status" aria-live="polite">点击任一动作的「录制」开始。</div><div class="mss-rows"></div><section class="mss-browser"><h3>浏览器扩展快捷键</h3><p>浏览器级扩展命令由浏览器管理，不随上方改键或禁用而改变。默认不占用浏览器级快捷键；如需跨页面唤起，可在浏览器设置中自行分配或移除。</p><code>${browserUrl}</code><br><button type="button" data-mss="browser">${onOpenBrowserShortcuts ? '打开浏览器快捷键设置' : '复制浏览器快捷键设置地址'}</button></section><p class="mss-tip">不同视图互斥的裁切与播放动作可以复用同一按键；会同时生效的组合会提示冲突。网页自身的快捷键可能需要另行关闭。</p></div><footer class="mss-foot"><span><button type="button" data-mss="disable-all">全部禁用</button> <button type="button" data-mss="reset">恢复默认</button></span><button type="button" data-mss="done">完成</button></footer></section>`;
    root.append(style, overlay);
    const status = overlay.querySelector('.mss-status'), rows = new Map(), drafts = new Map();
    let previousFocus = null, dead = false;
    const announce = (text, error = false) => { status.textContent = text; status.classList.toggle('error', error); };
    function paint() {
      for (const a of actions) { const row = rows.get(a.id); row.querySelector('kbd').textContent = label(a.id); const draft = drafts.get(a.id); row.querySelector('.mss-draft').textContent = draft ? '待保存：' + format(draft) : ''; row.querySelector('[data-mss="save"]').disabled = !draft; row.querySelector('[data-mss="record"]').textContent = recording === a.id ? '取消录制' : '录制'; row.dataset.recording = String(recording === a.id); }
    }
    function cancelRecording() { recording = null; paint(); }
    for (const a of actions) {
      const row = doc.createElement('div'); row.className = 'mss-row'; row.dataset.action = a.id;
      row.innerHTML = `<div><strong>${a.title}</strong><small>${a.group}</small></div><div class="mss-binding"><kbd></kbd><span class="mss-draft"></span></div><div class="mss-row-actions"><button type="button" data-mss="record" aria-label="录制${a.title}">录制</button><button type="button" data-mss="save" aria-label="保存${a.title}" disabled>保存</button><button type="button" data-mss="disable" aria-label="禁用${a.title}">禁用</button></div>`;
      overlay.querySelector('.mss-rows').append(row); rows.set(a.id, row);
    }
    async function run(task) { try { const result = await task(); if (!result?.ok) announce(result?.error || '保存失败。', true); return result; } catch (e) { announce(e.message || '保存失败，请重试。', true); return { ok: false }; } }
    overlay.addEventListener('click', async event => {
      const button = event.target.closest('button'), action = button?.dataset.mss, id = button?.closest('[data-action]')?.dataset.action;
      if (!action) return;
      if (action === 'close' || action === 'done') return api.close();
      if (action === 'record') { recording = recording === id ? null : id; announce(recording ? '请按组合键（可含 Ctrl / Alt / Shift / Meta）。Tab 仍用于移动焦点；再次点「取消录制」可退出。' : '已取消录制。'); paint(); return; }
      cancelRecording();
      if (action === 'save') { const result = await run(() => setBinding(id, drafts.get(id))); if (result.ok) { drafts.delete(id); paint(); announce('已保存「' + table.get(id).title + '」：' + label(id)); } }
      if (action === 'disable') { const result = await run(() => setBinding(id, null)); if (result.ok) { drafts.delete(id); paint(); announce('已禁用「' + table.get(id).title + '」；仍可用界面按钮操作。'); } }
      if (action === 'reset' || action === 'disable-all') { const result = await run(action === 'reset' ? reset : disableAll); if (result.ok) { drafts.clear(); paint(); announce(action === 'reset' ? '已恢复全部应用快捷键默认值。' : '已禁用全部应用快捷键。按钮和基础键盘导航仍可用。'); } }
      if (action === 'browser') { try { if (onOpenBrowserShortcuts) await onOpenBrowserShortcuts(browserUrl); else { await navigator.clipboard.writeText(browserUrl); announce('地址已复制，请粘贴到浏览器地址栏打开。'); } } catch (_) { announce('请将上方地址复制到浏览器地址栏打开。'); } }
    });
    function keydown(event) {
      if (overlay.hidden) return;
      const key = normalizeKey(event.key);
      if (recording && key !== 'Tab') {
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.isComposing) return;
        const b = normalize({ key: event.key, ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey, meta: event.metaKey });
        if (!b) return;
        const id = recording; recording = null; drafts.set(id, b); paint();
        const found = conflicts(id, [b]); announce(reserved(b) ? '这个组合由浏览器或系统使用，请重新录制。' : found.length ? '与「' + found.map(a => a.title).join('」「') + '」冲突，请重新录制。' : '已录制 ' + format(b) + '，点击「保存」生效。', reserved(b) || !!found.length);
        rows.get(id).querySelector('[data-mss="save"]').focus(); return;
      }
      if (key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); api.close(); return; }
      if (key === 'Tab') {
        const focusable = [...overlay.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length), index = focusable.indexOf(root.activeElement);
        if (event.shiftKey && index <= 0) { event.preventDefault(); focusable.at(-1)?.focus(); }
        else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0]?.focus(); }
      }
      // The original page must not run its keyboard shortcuts through this dialog.
      event.stopImmediatePropagation();
    }
    view.addEventListener('keydown', keydown, true);
    const unsubscribe = subscribe(() => { if (!dead) paint(); });
    const api = { open() { if (dead) return; previousFocus = root.activeElement || doc.activeElement; overlay.hidden = false; host.dataset.mssOpen = 'true'; drafts.clear(); recording = null; paint(); overlay.querySelector('[data-mss="close"]').focus(); }, close() { recording = null; overlay.hidden = true; delete host.dataset.mssOpen; drafts.clear(); previousFocus?.isConnected && previousFocus.focus?.({ preventScroll: true }); }, isOpen: () => !overlay.hidden, destroy() { if (dead) return; api.close(); dead = true; unsubscribe(); view.removeEventListener('keydown', keydown, true); overlay.remove(); style.remove(); if (settings === api) settings = null; } };
    settings = api; ready.then(paint); paint(); return api;
  }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  globalThis.MSShortcuts = Object.freeze({ ready, match, label, setBinding, reset, disableAll, subscribe, createSettings, open: () => settings?.open(), close: () => settings?.close(), isRecording: () => !!recording, isSettingsOpen: () => !!settings?.isOpen(), getBindings: () => clone(bindings), getActions: () => clone(actions), conflicts: (id, values) => conflicts(id, (Array.isArray(values) ? values : [values]).map(normalize).filter(Boolean)) });
})();
