/* Copyright (C) 2026 MIORNING. SPDX-License-Identifier: GPL-3.0-only */
/* Isolated-world peer for the bounded, read-only LibTV node media bridge. */
(() => {
  'use strict';
  if (globalThis.MSPlatform) return;
  const REQUEST = 'miorning-select:group-request-v1';
  const RESPONSE = 'miorning-select:group-response-v1';
  const pending = new WeakMap();
  globalThis.MSPlatform = Object.freeze({
    getGroup(element) {
      if (!(element instanceof Element) || !/(?:^|\.)liblib\.tv$/i.test(location.hostname)) return Promise.resolve([]);
      const node = element.closest('.react-flow__node-video,[data-nodeid],.react-flow__node') || element;
      const nodeId = node.getAttribute('data-nodeid') || node.getAttribute('data-id');
      if (!node.isConnected || !nodeId || nodeId.length > 180) return Promise.resolve([]);
      if (pending.has(node)) return pending.get(node);
      const task = new Promise(resolve => {
        const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2, '0')).join('');
        const previous = node.getAttribute('data-miorning-group-probe');
        let timer, done = false;
        const finish = items => {
          if (done) return; done = true; clearTimeout(timer); document.removeEventListener(RESPONSE, receive);
          if (node.getAttribute('data-miorning-group-probe') === nonce) {
            if (previous === null) node.removeAttribute('data-miorning-group-probe'); else node.setAttribute('data-miorning-group-probe', previous);
          }
          resolve(items);
        };
        const receive = event => {
          if (typeof event.detail !== 'string' || event.detail.length > 250000) return;
          let reply; try { reply = JSON.parse(event.detail); } catch { return; }
          if (reply?.nonce !== nonce || reply?.nodeId !== nodeId || reply?.provider !== 'libtv-react-props' || !Array.isArray(reply.items)) return;
          const seen = new Set(), items = [];
          for (const item of reply.items.slice(0, 16)) {
            if (!item || typeof item.src !== 'string' || item.src.length > 12000) continue;
            try {
              const src = new URL(item.src);
              if (!['http:', 'https:'].includes(src.protocol) || src.username || src.password || seen.has(src.href)) continue;
              seen.add(src.href); items.push({ src: src.href, name: typeof item.name === 'string' ? item.name.slice(0, 180) : '' });
            } catch { /* Ignore malformed page-provided candidates. */ }
          }
          finish(items);
        };
        document.addEventListener(RESPONSE, receive);
        timer = setTimeout(() => finish([]), 600);
        node.setAttribute('data-miorning-group-probe', nonce);
        document.dispatchEvent(new CustomEvent(REQUEST, { detail: JSON.stringify({ nonce, nodeId }) }));
      });
      pending.set(node, task); task.finally(() => { if (pending.get(node) === task) pending.delete(node); });
      return task;
    },
  });
})();
