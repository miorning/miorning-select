/* Copyright (C) 2026 MIORNING. SPDX-License-Identifier: GPL-3.0-only */
/* Local MP4 compressed-packet extraction. No canvas, MediaRecorder or encoder. */
(function(root){
  'use strict';
  const EPS=1e-6;
  const fail=(code,message)=>Object.assign(new Error(message),{code});
  const abortError=()=>new DOMException('已取消原画质截取。','AbortError');
  const readHint='无法读取原始视频数据，可能是跨域限制或链接失效。请下载原片后拖入本地文件；不会改用降低画质的录制。';
  const unsupported='当前格式尚不支持可靠的原画质截取。请使用 H.264 / AVC 编码的 MP4 原文件；内部片段仍保留，没有生成降画质的替代文件。';
  const decoder=new TextDecoder();
  function library(){if(!root.MSMediaPackets)throw fail('UNAVAILABLE','原画质截取模块未加载，请重新打开选片台。');return root.MSMediaPackets;}
  function listBoxes(data,start=0,end=data.length){const view=new DataView(data.buffer,data.byteOffset,data.byteLength),out=[];let at=start;while(at<end){if(at+8>end)throw fail('UNSUPPORTED_LOSSLESS','MP4 结构不完整。');let size=view.getUint32(at),header=8;const type=decoder.decode(data.subarray(at+4,at+8));if(size===1){if(at+16>end)throw fail('UNSUPPORTED_LOSSLESS','MP4 结构不完整。');size=Number(view.getBigUint64(at+8));header=16;}else if(size===0)size=end-at;if(!Number.isSafeInteger(size)||size<header||at+size>end)throw fail('UNSUPPORTED_LOSSLESS','MP4 结构无效。');out.push({type,start:at,end:at+size,header,payload:data.subarray(at+header,at+size)});at+=size;}return out;}
  function inspectEdits(data){
    for(const box of listBoxes(data)){
      if(['moov','trak','mdia','edts'].includes(box.type))inspectEdits(box.payload);
      if(box.type!=='elst')continue;const v=new DataView(box.payload.buffer,box.payload.byteOffset,box.payload.length),version=v.getUint8(0),count=v.getUint32(4),stride=version?20:12;let mediaEntries=0;
      if(version>1||count>2||8+count*stride!==box.payload.length)throw fail('UNSUPPORTED_LOSSLESS','原文件使用多段编辑时间表，当前不能可靠地按原画面截取；已停止导出。');
      for(let i=0;i<count;i++){const p=8+i*stride,mediaTime=version?Number(v.getBigInt64(p+8)):v.getInt32(p+4),rateAt=p+(version?16:8);if(v.getInt16(rateAt)!==1||v.getInt16(rateAt+2)!==0)throw fail('UNSUPPORTED_LOSSLESS','原文件含变速编辑时间表，当前不能原样截取。');if(mediaTime!==-1){mediaEntries++;if(mediaTime<0||i!==count-1)throw fail('UNSUPPORTED_LOSSLESS','原文件包含复杂编辑时间表，当前不能可靠截取。');}else if(i!==0)throw fail('UNSUPPORTED_LOSSLESS','原文件包含复杂编辑时间表，当前不能可靠截取。');}
      if(mediaEntries!==1)throw fail('UNSUPPORTED_LOSSLESS','原文件没有可验证的连续媒体时间表。');
    }
  }
  function inspectPixelAspect(data){
    let result=null;
    for(const box of listBoxes(data)){
      if(['moov','trak','mdia','minf','stbl'].includes(box.type)){const nested=inspectPixelAspect(box.payload);if(nested)result=nested;}
      if(box.type!=='stsd')continue;
      const entries=listBoxes(box.payload,8),videoEntries=entries.filter(b=>['avc1','avc3'].includes(b.type));
      if(videoEntries.length&&entries.length!==1)throw fail('UNSUPPORTED_LOSSLESS','原文件含切换编码配置，当前不能可靠地原样截取。');
      for(const entry of videoEntries){for(const child of listBoxes(entry.payload,78)){if(child.type!=='pasp')continue;if(child.payload.length!==8)throw fail('UNSUPPORTED_LOSSLESS','原文件的像素比例无效。');const v=new DataView(child.payload.buffer,child.payload.byteOffset,8),num=v.getUint32(0),den=v.getUint32(4);if(!num||!den)throw fail('UNSUPPORTED_LOSSLESS','原文件的像素比例无效。');result={num,den};}}
    }
    return result;
  }
  function exactDisplayConfig(config,aspect){
    if(!config)throw fail('UNSUPPORTED_LOSSLESS','无法读取原文件的视频编码配置。');
    if(!aspect){if(config.displayAspectWidth&&config.displayAspectHeight&&config.displayAspectWidth*config.codedHeight!==config.displayAspectHeight*config.codedWidth)throw fail('UNSUPPORTED_LOSSLESS','原文件的非方形像素比例缺少可验证的精确标记，已停止导出。');return config;}
    const num=config.codedWidth*aspect.num,den=config.codedHeight*aspect.den;if(!Number.isSafeInteger(num)||!Number.isSafeInteger(den))throw fail('UNSUPPORTED_LOSSLESS','原文件的像素比例超出可安全保留范围。');
    const gcd=(a,b)=>b?gcd(b,a%b):a,divisor=gcd(num,den);return{...config,displayAspectWidth:num/divisor,displayAspectHeight:den/divisor};
  }
  function accessSource(options,signal){
    let cached=options.blob instanceof Blob?options.blob:null,pixelAspect=null;const src=options.src;
    if(!cached&&(typeof src!=='string'||!/^https?:|^blob:|^data:video\//i.test(src)))throw fail('READ_BLOCKED',readHint);
    const fetchFn=(url,init={})=>fetch(url,{...init,signal:AbortSignal.any([signal,...(init.signal?[init.signal]:[])])});
    async function read(start,length){if(cached)return new Uint8Array(await cached.slice(start,start+length).arrayBuffer());const response=await fetchFn(src,{mode:'cors',credentials:'same-origin',headers:{Range:`bytes=${start}-${start+length-1}`}});if(!response.ok)throw fail('READ_BLOCKED',readHint);if(response.status===200){cached=await response.blob();return new Uint8Array(await cached.slice(start,start+length).arrayBuffer());}const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==length)throw fail('READ_BLOCKED','原文件的分段读取响应不完整，请改用本地文件。');return bytes;}
    async function preflight(){let offset=0,seenFtyp=false;for(let n=0;n<128;n++){const head=await read(offset,16);if(head.length<8)break;const v=new DataView(head.buffer,head.byteOffset,head.byteLength);let size=v.getUint32(0);const type=decoder.decode(head.subarray(4,8));if(n===0&&type!=='ftyp')throw fail('UNSUPPORTED_LOSSLESS',unsupported);if(type==='ftyp')seenFtyp=true;if(size===1){if(head.length<16)throw fail('UNSUPPORTED_LOSSLESS','MP4 结构不完整。');size=Number(v.getBigUint64(8));}if(!size||!Number.isSafeInteger(size)||size<8||offset+size>Number.MAX_SAFE_INTEGER)throw fail('UNSUPPORTED_LOSSLESS','MP4 结构无法安全读取。');if(type==='moov'){if(size>64*1024*1024)throw fail('UNSUPPORTED_LOSSLESS','原文件的轨道索引过大，请使用较短的 MP4 原片。');const moov=await read(offset,size);inspectEdits(moov);pixelAspect=inspectPixelAspect(moov);return;}offset+=size;}throw fail('UNSUPPORTED_LOSSLESS',seenFtyp?'原文件没有可读取的完整 MP4 轨道索引。':unsupported);}
    return{preflight,get pixelAspect(){return pixelAspect;},input(B){return new B.Input({source:cached?new B.BlobSource(cached):new B.UrlSource(src,{requestInit:{mode:'cors',credentials:'same-origin'},fetchFn}),formats:[B.MP4]});}};
  }
  async function nativeCheck(blob,expectedDuration,frameDuration,signal){
    if(signal.aborted)throw signal.reason||abortError();if(typeof document==='undefined')return;const video=document.createElement('video'),url=URL.createObjectURL(blob);video.muted=true;video.preload='auto';video.playsInline=true;
    const wait=(events,predicate)=>new Promise((resolve,reject)=>{let timer;const cleanup=()=>{clearTimeout(timer);events.forEach(e=>video.removeEventListener(e,check));video.removeEventListener('error',bad);signal.removeEventListener('abort',aborted);};const done=e=>{cleanup();e?reject(e):resolve();};const check=()=>{if(predicate())done();};const bad=()=>done(fail('UNSUPPORTED_LOSSLESS','浏览器无法解码这个原画质片段，已停止交付。'));const aborted=()=>done(signal.reason||abortError());events.forEach(e=>video.addEventListener(e,check));video.addEventListener('error',bad);signal.addEventListener('abort',aborted,{once:true});timer=setTimeout(()=>done(fail('UNSUPPORTED_LOSSLESS','原画质片段播放验证超时，未生成替代录制。')),15000);check();});
    const verifyDuration=()=>{if(!Number.isFinite(video.duration)||Math.abs(video.duration-expectedDuration)>Math.max(.002,frameDuration*.1))throw fail('UNSUPPORTED_LOSSLESS_RANGE','浏览器未正确识别所选边界；内部片段保留，请换一个邻近初始帧重试。');};
    try{video.src=url;await wait(['loadeddata','canplay'],()=>video.readyState>=2);verifyDuration();const time=Math.max(0,expectedDuration-frameDuration*.5);if(time>.001){video.currentTime=time;await wait(['seeked','loadeddata'],()=>!video.seeking&&video.readyState>=2);}verifyDuration();if(video.error)throw fail('UNSUPPORTED_LOSSLESS_RANGE','片段尾帧无法完整解码，已停止交付。');}
    finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
  }
  async function exportSegment(options={}){
    const B=library(),controller=new AbortController();let input=null,output=null,timeout;
    const cancel=()=>{controller.abort(options.signal?.reason||abortError());output?.cancel().catch(()=>{});input?.dispose();};
    const check=()=>{if(controller.signal.aborted)throw controller.signal.reason||abortError();};
    const progress=(phase,value,duration)=>{check();options.onProgress?.({phase,progress:value,time:value*duration,duration});};
    if(options.signal?.aborted)throw abortError();options.signal?.addEventListener('abort',cancel,{once:true});
    try{
      timeout=setTimeout(()=>{controller.abort(fail('READ_BLOCKED','读取原文件超过 30 秒，请检查网络或改用本地文件。'));input?.dispose();},30000);
      progress('read',0,0);const access=accessSource(options,controller.signal);await access.preflight();input=access.input(B);const videos=await input.getVideoTracks(),audios=await input.getAudioTracks();if(videos.length!==1)throw fail('UNSUPPORTED_LOSSLESS','当前原画质截取支持单视频轨 MP4；内部片段已保留。');const video=videos[0],videoCodec=await video.getCodec();if(videoCodec!=='avc')throw fail('UNSUPPORTED_LOSSLESS',unsupported);
      const videoConfig=exactDisplayConfig(await video.getDecoderConfig(),access.pixelAspect),sourceDuration=await video.computeDuration(),requestedStart=Number(options.in??0),requestedEnd=Number(options.out??sourceDuration);if(!Number.isFinite(requestedStart)||!Number.isFinite(requestedEnd)||requestedStart<0||requestedStart>=sourceDuration||Math.min(requestedEnd,sourceDuration)-requestedStart<.05-EPS||requestedEnd>sourceDuration+.08)throw fail('INVALID_RANGE','请选择原片内至少 0.05 秒的片段。');
      const sink=new B.EncodedPacketSink(video),first=await sink.getPacket(requestedStart,{metadataOnly:true});if(!first||first.duration<=0)throw fail('UNSUPPORTED_LOSSLESS_RANGE','没有找到所选初始帧，请换一个邻近帧重试。');const actualStart=Math.max(0,first.timestamp),frameDuration=first.duration;
      const target=Math.min(sourceDuration,actualStart+(Math.min(requestedEnd,sourceDuration)-requestedStart));let actualEnd;
      if(requestedEnd>=sourceDuration-EPS)actualEnd=sourceDuration;else{const last=await sink.getPacket(target,{metadataOnly:true});if(!last)throw fail('UNSUPPORTED_LOSSLESS_RANGE','没有找到片段结束帧。');const candidates=[last.timestamp,Math.min(sourceDuration,last.timestamp+last.duration)].filter(t=>t-actualStart>=.05-EPS);actualEnd=candidates.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target))[0];}
      if(!Number.isFinite(actualEnd)||actualEnd<=actualStart)throw fail('INVALID_RANGE','所选范围没有完整的视频帧。');const duration=actualEnd-actualStart,key=await sink.getKeyPacket(actualStart,{verifyKeyPackets:true});if(!key)throw fail('UNSUPPORTED_LOSSLESS_RANGE','初始帧之前没有可验证的独立关键帧，不能保证完整解码。');
      // Maximum decode index of ANY visible frame; presentation order alone is
      // insufficient for hierarchical B-frames. Later reference pictures remain decode-only.
      let count=0,lastNeeded=-1,referencePackets=0;
      for await(const p of sink.packets(key,undefined,{verifyKeyPackets:true})){check();if(p.type==='key'&&p.timestamp>=actualEnd-EPS&&count>0)break;if(p.timestamp<actualEnd-EPS&&p.timestamp+p.duration>actualStart+EPS)lastNeeded=count;count++;if(count>250000)throw fail('UNSUPPORTED_LOSSLESS_RANGE','原文件关键帧间隔过长，请换一个邻近关键帧后重试。');}
      if(lastNeeded<0)throw fail('UNSUPPORTED_LOSSLESS_RANGE','所选范围没有可播放的原始帧。');
      const audioPlans=[],audioCodecs=[],silentAudioCodecs=[];for(const track of audios){const codec=await track.getCodec();if(!['aac','opus','mp3','flac','ac3','eac3'].includes(codec))throw fail('UNSUPPORTED_LOSSLESS','当前音轨不能原样保留，已停止导出，不会丢弃音轨或重编码。');if(await track.computeDuration()<=actualStart+EPS){silentAudioCodecs.push(codec);continue;}const audioSink=new B.EncodedPacketSink(track),audioFirst=await audioSink.getPacket(Math.max(0,actualStart-.12))||await audioSink.getFirstPacket();if(audioFirst){audioPlans.push({track,codec,sink:audioSink,first:audioFirst,config:await track.getDecoderConfig()});audioCodecs.push(codec);}}
      clearTimeout(timeout);check();output=new B.Output({format:new B.Mp4OutputFormat({fastStart:false}),target:new B.BufferTarget()});const videoSource=new B.EncodedVideoPacketSource(videoCodec);output.addVideoTrack(videoSource,{transformationMatrix:await video.getTransformationMatrix(),name:await video.getName()||undefined,disposition:await video.getDisposition(),bitrate:await video.getBitrate()||undefined,averageBitrate:await video.getAverageBitrate()||undefined});for(const p of audioPlans){p.source=new B.EncodedAudioPacketSource(p.codec);output.addAudioTrack(p.source,{name:await p.track.getName()||undefined,disposition:await p.track.getDisposition()});}await output.start();
      let copied=0;for await(const packet of sink.packets(key,undefined,{verifyKeyPackets:true})){check();if(copied>lastNeeded)break;const helper=packet.timestamp>=actualEnd-EPS;referencePackets+=helper?1:0;await videoSource.add(packet.clone({timestamp:helper?duration:packet.timestamp-actualStart,duration:helper?0:packet.duration}),{decoderConfig:videoConfig});copied++;progress('copy',.8*copied/(lastNeeded+1),duration);}videoSource.close();
      for(let i=0;i<audioPlans.length;i++){const p=audioPlans[i];for await(const packet of p.sink.packets(p.first)){check();if(packet.timestamp>=actualEnd-EPS)break;await p.source.add(packet.clone({timestamp:packet.timestamp-actualStart,duration:Math.min(packet.duration,actualEnd-packet.timestamp)}),{decoderConfig:p.config});}p.source.close();progress('copy',.8+.12*(i+1)/audioPlans.length,duration);}
      await output.finalize();check();progress('verify',.96,duration);const blob=new Blob([output.target.buffer],{type:'video/mp4'});await nativeCheck(blob,duration,frameDuration,controller.signal);check();
      const [width,height,codedWidth,codedHeight]=await Promise.all([video.getDisplayWidth(),video.getDisplayHeight(),video.getCodedWidth(),video.getCodedHeight()]);progress('verify',1,duration);
      return{blob,extension:'mp4',mimeType:'video/mp4',duration,width,height,codedWidth,codedHeight,quality:'packet-copy',packetCopy:true,videoCodec,audioCodecs,silentAudioCodecs,requestedStart,requestedEnd,actualStart,actualEnd,frameDuration,fps:1/frameDuration,prerollSeconds:Math.max(0,actualStart-key.timestamp),postrollSeconds:0,decodeOnlyReferencePackets:referencePackets};
    }catch(error){if(controller.signal.aborted)throw controller.signal.reason||abortError();if(error?.code||error?.name==='AbortError')throw error;throw fail('READ_BLOCKED',readHint+' '+String(error?.message||'').slice(0,180));}
    finally{clearTimeout(timeout);options.signal?.removeEventListener('abort',cancel);if(output&&output.state!=='finalized'&&output.state!=='canceled')await output.cancel().catch(()=>{});input?.dispose();}
  }
  root.MSLossless={version:2,exportSegment};
})(globalThis);
