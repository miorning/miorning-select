/* Copyright (C) 2026 MIORNING. SPDX-License-Identifier: GPL-3.0-only */
'use strict';
importScripts('persistence.js');
async function activate(tab, mode='menu') {
  if (!tab?.id) return;
  try {
    await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{globalThis.__miorningLauncher?.destroy();}});
    // Read-only MAIN-world adapter; it is inert until a selected node is probed.
    await chrome.scripting.executeScript({target:{tabId:tab.id}, world:'MAIN', files:['group-bridge.js']});
    await chrome.scripting.executeScript({target:{tabId:tab.id}, files:['assets.js','styles.js','shortcuts.js','engine.js','exporter.js','editor.js','persistence.js','group-client.js','dock.js','platform-paste.js','storage-ui.js','vendor/mediabunny-1.62.0.js','lossless.js','quickcuts.js','content.js']});
    await chrome.scripting.executeScript({target:{tabId:tab.id}, args:[mode],func:mode=>globalThis.__miorningSelect[['select','open','import','help','shortcuts','storage'].includes(mode)?mode:'menu']()});
    await chrome.action.setBadgeText({tabId:tab.id,text:''});
    await chrome.action.setTitle({tabId:tab.id,title:'喵咛选片台：打开图标菜单'});
  } catch (error) {
    await chrome.action.setBadgeText({tabId:tab.id,text:'!'});
    await chrome.action.setBadgeBackgroundColor({tabId:tab.id,color:'#c44545'});
    await chrome.action.setTitle({tabId:tab.id,title:'此页不能打开选片台。请在普通网页中使用；本地文件需允许访问文件网址。'});
    console.warn('Selection desk unavailable:', String(error.message));
  }
}
chrome.action.onClicked.addListener(tab=>activate(tab,'menu'));
chrome.commands.onCommand.addListener(async(command,tab)=>{if(command!=='start-capture')return;if(!tab?.id){const tabs=await chrome.tabs.query({active:true,currentWindow:true});tab=tabs[0];}await activate(tab,'select');});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||message?.channel!=='miorning-launcher')return;
  if(message.action==='activate'&&sender.tab){activate(sender.tab,message.mode).then(()=>reply({ok:true}));return true;}
  if(message.action==='browser-shortcuts'||message.action==='profile-path'){
    const protocol=/Edg\//.test(navigator.userAgent)?'edge':'chrome';
    chrome.tabs.create({url:protocol+'://'+(message.action==='browser-shortcuts'?'extensions/shortcuts':'version')}).then(()=>reply({ok:true}),e=>reply({error:e.message}));return true;
  }
});
chrome.runtime.onInstalled.addListener(async()=>{
  // Quietly add the lightweight head to existing ordinary tabs; never open onboarding.
  for(const tab of await chrome.tabs.query({url:['http://*/*','https://*/*']})){
    try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:['assets.js','shortcuts.js','dock.js','launcher.js']});}catch{}
  }
});
