/* Copyright (C) 2026 MIORNING. SPDX-License-Identifier: GPL-3.0-only */
/* One extension-origin library shared by every page. Never opens the page's IndexedDB. */
(() => {
  'use strict';
  if(typeof document==='undefined'){importScripts('storage-backend.js');return;}
  if(globalThis.MSPersistence)return;
  const CHANNEL='miorning-select-persistence-v1',DB_NAME='miorning-select-persistence-v1',GLOBAL_SCOPE='__miorning_global_v1__';
  const MAX_FILE_BYTES=250*1024*1024,CHUNK_BYTES=256*1024;
  const error=(message,code='storage',details={})=>Object.assign(new Error(message),{code,...details});
  const aborted=()=>error('缓存已取消；未保留不完整文件。','cancelled',{name:'AbortError'});
  function scopeKey(address){const url=new URL(address),keys=/^(?:(?:project|canvas|workspace|space|draft|design|board|doc|document)(?:_?id|_?uuid)?|id)$/i;const params=u=>new URLSearchParams([...u.searchParams.entries()].filter(([k])=>keys.test(k)).sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1])));let route='';if(url.hash.startsWith('#/')){const routed=new URL(url.hash.slice(1),'https://route.invalid');route=routed.pathname+'?'+params(routed);}return`${url.protocol}//${url.host}${url.pathname}?${params(url)}${route?'#'+route:''}`;}
  function encode(bytes){let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary);}
  function decode(base64){const binary=atob(base64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
  const tokenOf=value=>({revision:value.revision,epoch:value.epoch});
  const clientId=crypto.randomUUID(),subscribers=new Set(),remoteJobs=new Set();let token=null,readGeneration=0,mutations=Promise.resolve();
  // Disconnect is tied to this document, unlike tabs.onUpdated which can also fire for SPAs.
  const lifetime=chrome.runtime.connect({name:CHANNEL+':lifecycle'});lifetime.postMessage({clientId});
  async function request(action,data={},pageScope=scopeKey(location.href)){
    let response;try{response=await chrome.runtime.sendMessage({channel:CHANNEL,action,scope:pageScope,clientId,...data});}catch{throw error('本地保存连接已中断，请重新打开选片台。','connection');}
    if(!response?.ok)throw error(response?.message||'本地缓存暂不可用，请重试。',response?.code,response?.details||{});return response.result;
  }
  async function load(){const generation=++readGeneration,session=await request('load');if(generation===readGeneration)token=tokenOf(session._storage);return session;}
  async function ensureToken(){if(!token)await load();return {...token};}
  function mutate(action,data={},options){const generation=readGeneration,epoch=token?.epoch;const run=async()=>{if(token&&generation!==readGeneration)throw error('素材库已刷新，请使用当前列表再操作。','conflict');await ensureToken();if(epoch&&epoch!==token.epoch)throw error('素材库已经清空，请使用当前列表再操作。','conflict');const base=options?.revision!==undefined?{revision:options.revision,epoch:options.epoch}:token;const result=await request(action,{...data,base});token=tokenOf(result);return result;};const pending=mutations.then(run,run);mutations=pending.catch(()=>{});return pending;}
  chrome.runtime.onMessage.addListener(message=>{if(message?.channel!==CHANNEL||message.event!=='changed')return;const event={...message,local:message.clientId===clientId};for(const subscriber of subscribers){try{subscriber(event);}catch(e){console.warn('素材库同步回调失败',e);}}});
  async function cacheFile(file,{signal,onProgress}={}){
    if(!(file instanceof Blob))throw error('请选择有效的媒体文件。','invalid-file');if(file.size<=0||file.size>MAX_FILE_BYTES)throw error('单个文件必须为非空且不超过 250 MiB；原片不受影响。','file-too-large');if(signal?.aborted)throw aborted();const base=await ensureToken(),pageScope=scopeKey(location.href);let key=null;
    try{key=await request('file-begin',{epoch:base.epoch,name:file.name||'本地素材',type:file.type||'',size:file.size,lastModified:file.lastModified||Date.now()},pageScope);for(let offset=0,index=0;offset<file.size;offset+=CHUNK_BYTES,index++){if(signal?.aborted)throw aborted();const bytes=new Uint8Array(await file.slice(offset,offset+CHUNK_BYTES).arrayBuffer());await request('file-chunk',{epoch:base.epoch,cacheKey:key,index,bytes:encode(bytes)},pageScope);onProgress?.({received:Math.min(file.size,offset+bytes.length),total:file.size,progress:Math.min(1,(offset+bytes.length)/file.size)});}if(signal?.aborted)throw aborted();await request('file-finish',{epoch:base.epoch,cacheKey:key},pageScope);return key;}catch(failure){if(key)await request('file-discard',{cacheKey:key},pageScope).catch(()=>{});throw failure;}
  }
  async function cacheRemote({src,name,type,sourceKey,signal,onProgress}={}){
    const url=new URL(src,location.href);if(!['http:','https:','blob:'].includes(url.protocol)||url.username||url.password)throw error('只支持当前可读取的普通媒体链接。','invalid-source');if(signal?.aborted)throw aborted();
    if(url.protocol==='blob:'){let response;try{response=await fetch(url.href,{signal});}catch{if(signal?.aborted)throw aborted();throw error('此页面的临时素材无法读取，请导入原文件。','network');}const blob=await response.blob();return cacheFile(new File([blob],name||'网页素材',{type:blob.type||type||'video/mp4'}),{signal,onProgress});}
    const base=await ensureToken(),pageScope=scopeKey(location.href),job=await request('remote-start',{epoch:base.epoch,src:url.href,name,type,sourceKey},pageScope);if(job.cacheKey){if(signal?.aborted)throw aborted();return job.cacheKey;}remoteJobs.add(job.jobId);const cancel=()=>request('remote-cancel',{jobId:job.jobId},pageScope).catch(()=>{});signal?.addEventListener('abort',cancel,{once:true});
    try{for(;;){if(signal?.aborted){await cancel();throw aborted();}const state=await request('remote-status',{jobId:job.jobId},pageScope);onProgress?.({received:state.received||0,total:state.total||0,progress:state.total?Math.min(1,state.received/state.total):0});if(state.status==='complete')return state.cacheKey;if(state.status==='failed')throw error(state.message,state.code);await new Promise(resolve=>setTimeout(resolve,250));}}catch(e){await cancel();throw e;}finally{signal?.removeEventListener('abort',cancel);remoteJobs.delete(job.jobId);}
  }
  window.addEventListener('pagehide',()=>{for(const jobId of remoteJobs)request('remote-cancel',{jobId}).catch(()=>{});});
  globalThis.MSPersistence=Object.freeze({MAX_FILE_BYTES,DB_NAME,GLOBAL_SCOPE,getScopeKey:()=>scopeKey(location.href),getToken:()=>token&&({...token}),load,
    save:(session,options)=>mutate('save',{session:JSON.parse(JSON.stringify(session))},options),clearAll:options=>mutate('clear-all',{},options),removeFile:(cacheKey,options)=>mutate('file-delete',{cacheKey},options),discardFile:cacheKey=>request('file-discard-unreferenced',{cacheKey}),
    stats:()=>request('stats'),listLegacy:()=>request('legacy-list'),loadLegacy:scope=>request('legacy-load',{legacyScope:scope}),
    subscribe(fn){if(typeof fn!=='function')throw TypeError('subscribe expects a function');subscribers.add(fn);return()=>subscribers.delete(fn);},cacheFile,cacheRemote,
    async resolveFile(cacheKey){const metadata=await request('file-meta',{cacheKey});if(!metadata)return null;const pieces=[];for(let index=0;index<metadata.chunkCount;index++){const encoded=await request('file-read',{cacheKey,index});if(typeof encoded!=='string')throw error('这份缓存已删除或不完整，请重新导入。','cache-missing');pieces.push(decode(encoded));}const file=new File(pieces,metadata.name,{type:metadata.type,lastModified:metadata.lastModified});if(file.size!==metadata.size)throw error('这份缓存大小不完整，请重新导入。','cache-missing');return file;},listFiles:()=>request('file-list')});
})();
