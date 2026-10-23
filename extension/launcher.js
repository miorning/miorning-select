/* Copyright (C) 2026 MIORNING. SPDX-License-Identifier: GPL-3.0-only */
(() => {
  'use strict';
  if(globalThis.__miorningLauncher||globalThis.__miorningSelect)return;
  const host=document.createElement('div');host.id='miorning-select-launcher';
  host.style.cssText='position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483644!important;';
  const root=host.attachShadow({mode:'open'});document.documentElement.append(host);
  let busy=false;
  async function activate(mode){if(busy)return;busy=true;try{await chrome.runtime.sendMessage({channel:'miorning-launcher',action:'activate',mode});}catch{busy=false;}}
  const dock=MSDock.create({root,host,icon:MS_ICON,onSelect:()=>activate('select'),onOpen:()=>activate('open'),onImport:()=>activate('import'),onHelp:()=>activate('help'),onShortcuts:()=>activate('shortcuts'),onStorage:()=>activate('storage'),onPause:()=>{}});
  function keydown(e){const selecting=MSShortcuts.match(e,'select');if(selecting||MSShortcuts.match(e,'toggleDesk')){e.preventDefault();e.stopImmediatePropagation();activate(selecting?'select':'open');}}
  window.addEventListener('keydown',keydown,true);
  globalThis.__miorningLauncher={destroy(){window.removeEventListener('keydown',keydown,true);dock.destroy();host.remove();delete globalThis.__miorningLauncher;}};
})();
