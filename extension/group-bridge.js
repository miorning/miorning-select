/* Copyright (C) 2026 MIORNING. SPDX-License-Identifier: GPL-3.0-only */
/* Read-only, opt-in bridge for media lists attached to one selected LibTV node. */
(() => {
  'use strict';
  if (globalThis.__miorningGroupBridgeV1) return;
  globalThis.__miorningGroupBridgeV1 = true;
  const REQUEST = 'miorning-select:group-request-v1';
  const RESPONSE = 'miorning-select:group-response-v1';
  function own(object, key) {
    if (!object || typeof object !== 'object') return undefined;
    try { const property = Object.getOwnPropertyDescriptor(object, key); return property && 'value' in property ? property.value : undefined; }
    catch { return undefined; }
  }
  function mediaUrl(value) {
    if (typeof value !== 'string' || value.length > 12000) return null;
    try {
      const url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || /\.(?:jpe?g|png|webp|gif|svg|avif)$/i.test(url.pathname)) return null;
      return url.href;
    } catch { return null; }
  }
  function collect(node) {
    const items = [], seenUrls = new Set(), visited = new Set(), queue = [];
    const add = (value, label) => {
      const src = mediaUrl(value); if (!src || seenUrls.has(src) || items.length >= 16) return;
      seenUrls.add(src); items.push({ src, name: typeof label === 'string' ? label.slice(0, 180) : '' });
    };
    const readList = list => {
      const values = Array.isArray(list) ? list.slice(0, 32) : [list];
      for (const value of values) {
        if (typeof value === 'string') { add(value, ''); continue; }
        if (!value || typeof value !== 'object') continue;
        const name = own(value, 'name') || own(value, 'fileName') || own(value, 'title');
        for (const key of ['url', 'videoUrl', 'src', 'playUrl']) {
          const candidate = own(value, key);
          if (Array.isArray(candidate)) candidate.slice(0, 16).forEach(url => add(url, name)); else add(candidate, name);
        }
      }
    };
    // Reading property descriptors avoids invoking page-defined getters. No
    // React parent traversal, component state, platform store or account data.
    for (const key of Object.getOwnPropertyNames(node).slice(0, 128)) {
      if (key.startsWith('__reactProps$')) queue.push({ value: own(node, key), depth: 0 });
      if (key.startsWith('__reactFiber$')) queue.push({ value: own(own(node, key), 'memoizedProps'), depth: 0 });
    }
    let processed = 0;
    while (queue.length && processed++ < 80 && items.length < 16) {
      const { value, depth } = queue.shift();
      if (!value || typeof value !== 'object' || visited.has(value)) continue;
      visited.add(value);
      for (const key of ['videoList', 'videoUrls']) { const list = own(value, key); if (list !== undefined) readList(list); }
      if (depth >= 4) continue;
      for (const key of ['data', 'props', 'children']) {
        const child = own(value, key);
        if (Array.isArray(child)) child.slice(0, 12).forEach(item => queue.push({ value: item, depth: depth + 1 }));
        else if (child && typeof child === 'object') queue.push({ value: child, depth: depth + 1 });
      }
    }
    return items;
  }
  document.addEventListener(REQUEST, event => {
    if (typeof event.detail !== 'string' || event.detail.length > 2000) return;
    let request;
    try { request = JSON.parse(event.detail); } catch { return; }
    const { nonce, nodeId } = request || {};
    if (typeof nonce !== 'string' || !/^[a-f0-9]{32}$/.test(nonce) || typeof nodeId !== 'string' || !nodeId || nodeId.length > 180) return;
    if (!/(?:^|\.)liblib\.tv$/i.test(location.hostname)) return;
    const escaped = CSS.escape(nodeId);
    const nodes = [...document.querySelectorAll(`[data-id="${escaped}"],[data-nodeid="${escaped}"]`)].filter(node => node.getAttribute('data-miorning-group-probe') === nonce);
    if (nodes.length !== 1) return;
    const node = nodes[0];
    if (!node.matches('.react-flow__node-video,.react-flow__node,[data-nodeid]')) return;
    const items = collect(node);
    document.dispatchEvent(new CustomEvent(RESPONSE, { detail: JSON.stringify({ nonce, nodeId, items, provider: 'libtv-react-props', verified: false }) }));
  });
})();
