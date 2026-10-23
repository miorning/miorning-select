/* Copyright (C) 2026 MIORNING. SPDX-License-Identifier: GPL-3.0-only */
/* Browser-local, real-time sequence export. No network upload or third-party code. */
(function (root) {
  'use strict';
  const abortError = () => new DOMException('已取消导出。', 'AbortError');
  const corsHint = '无法读取素材用于导出，可能是跨域限制或链接已失效。请下载原片后重新以本地文件导入。';

  async function exportSequence({ clips, audio = null, sound = 'source', resolution = 'original', onProgress, signal } = {}) {
    if (!Array.isArray(clips) || !clips.length) throw Error('请先加入至少一个有效片段。');
    if (!['source', 'music', 'mute'].includes(sound)) throw Error('请选择原声、配乐或静音。');
    if (!['original', '720'].includes(resolution)) throw Error('请选择原始分辨率或 720p。');
    if (sound === 'music' && !audio?.src) throw Error('请先导入配乐，或将声音改为原声 / 静音。');
    if (!root.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw Error('浏览器不支持本地视频导出，请使用较新的 Chrome 或 Edge。');
    if (signal?.aborted) throw abortError();
    if (document.hidden) throw Error('请保持选片台页面在前台，再开始导出。');

    const controller = new AbortController();
    const sessionSignal = controller.signal;
    const container = document.createElement('div');
    container.dataset.miorningExport = 'true';
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = 'position:fixed;left:-10000px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;overflow:hidden';
    document.documentElement.append(container);
    const elements = [], nodes = [], streams = [];
    let context = null, destination = null, recorder = null, stopPromise = null, recordedMime = '';
    let duration = 0, width = 0, height = 0, recorded = 0;
    const chunks = [];
    const onAbort = () => controller.abort(abortError());
    const onVisibility = () => { if (document.hidden) controller.abort(Error('导出已停止：页面进入后台。请保持此标签页在前台，重新导出。')); };
    signal?.addEventListener('abort', onAbort, { once: true });
    document.addEventListener('visibilitychange', onVisibility);
    const check = () => { if (sessionSignal.aborted) throw sessionSignal.reason || abortError(); };
    const progress = (phase, time = recorded, fraction = null) => {
      if (typeof onProgress === 'function') {
        try { onProgress({ phase, progress: fraction ?? (duration ? Math.min(1, time / duration) : 0), time, duration }); }
        catch { controller.abort(Error('导出进度界面发生错误，请重新打开工作台后重试。')); }
      }
    };
    const guarded = (promise, timeout = 20000, message = '素材等待超时，请确认文件能播放后重试。') => new Promise((resolve, reject) => {
      let timer;
      const clear = () => { clearTimeout(timer); sessionSignal.removeEventListener('abort', abort); };
      const abort = () => { clear(); reject(sessionSignal.reason || abortError()); };
      if (sessionSignal.aborted) { abort(); return; }
      sessionSignal.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => { clear(); reject(Error(message)); }, timeout);
      Promise.resolve(promise).then(value => { clear(); resolve(value); }, error => { clear(); reject(error); });
    });
    const ready = (media, predicate, events, timeout = 20000) => {
      check();
      if (predicate()) return Promise.resolve();
      return new Promise((resolve, reject) => {
        let timer;
        const cleanup = () => { clearTimeout(timer); for (const event of events) media.removeEventListener(event, update); media.removeEventListener('error', failed); sessionSignal.removeEventListener('abort', abort); };
        const finish = (error) => { cleanup(); error ? reject(error) : resolve(); };
        const update = () => { if (predicate()) finish(); };
        const failed = () => finish(Error(corsHint));
        const abort = () => finish(sessionSignal.reason || abortError());
        for (const event of events) media.addEventListener(event, update);
        media.addEventListener('error', failed, { once: true });
        sessionSignal.addEventListener('abort', abort, { once: true });
        timer = setTimeout(() => finish(Error('素材读取或定位超过 20 秒。请下载原片后重新以本地文件导入。')), timeout);
      });
    };
    async function seek(media, time) {
      check();
      if (Math.abs(media.currentTime - time) > .002) {
        media.currentTime = time;
        await ready(media, () => !media.seeking && media.readyState >= 2, ['seeked', 'loadeddata', 'canplay']);
      } else await ready(media, () => media.readyState >= 2, ['loadeddata', 'canplay']);
    }
    async function prepare(item, kind, index) {
      if (typeof item?.src !== 'string' || !item.src) throw Error(`第 ${index + 1} 个素材缺少播放来源，请重新导入。`);
      const media = document.createElement(kind);
      elements.push(media);
      media.crossOrigin = 'anonymous';
      media.preload = 'auto'; media.playsInline = true; media.muted = true;
      container.append(media);
      media.src = item.src;
      media.load();
      await ready(media, () => media.readyState >= 1, ['loadedmetadata']);
      if (!Number.isFinite(media.duration)) {
        media.currentTime = 1e10;
        await ready(media, () => Number.isFinite(media.duration), ['durationchange', 'seeked']);
      }
      const start = Number(item.in ?? 0), end = Number(item.out ?? media.duration);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > media.duration + .08 || Math.min(end, media.duration) - start < .05 - 1e-6) throw Error(`第 ${index + 1} 个素材的入点 / 出点无效，请保留至少 0.05 秒并限定在原片时长内。`);
      const clip = { media, in: start, out: Math.min(end, media.duration), offset: Math.max(0, Number(item.offset) || 0) };
      clip.duration = clip.out - clip.in;
      await seek(media, clip.in);
      if (kind === 'video' && (!media.videoWidth || !media.videoHeight)) throw Error(`第 ${index + 1} 个素材没有可解码的视频画面。`);
      return clip;
    }
    const play = async media => {
      check();
      try { await guarded(media.play()); }
      catch (error) {
        check();
        if (error?.name === 'NotAllowedError') throw Error('浏览器阻止了播放。请手动点击导出，并允许当前页面播放声音后重试。');
        throw Error('素材无法继续播放。请先确认原片可播放，或下载后以本地文件导入。');
      }
    };

    try {
      // Resume while the initiating click still grants user activation.
      if (sound !== 'mute') {
        const AudioContextClass = root.AudioContext || root.webkitAudioContext;
        if (!AudioContextClass) throw Error('浏览器不支持音频导出，请使用 Chrome / Edge 或选择静音。');
        context = new AudioContextClass();
        destination = context.createMediaStreamDestination();
        streams.push(destination.stream);
        await guarded(context.resume(), 5000, '浏览器未允许声音处理，请再次手动点击导出，或选择静音。');
      }
      progress('prepare', 0, 0);
      const prepared = [];
      const probe = document.createElement('canvas'); probe.width = probe.height = 2;
      const probeContext = probe.getContext('2d', { willReadFrequently: true });
      for (let i = 0; i < clips.length; i++) {
        check();
        const clip = await prepare(clips[i], 'video', i);
        try { probeContext.drawImage(clip.media, 0, 0, 2, 2); probeContext.getImageData(0, 0, 1, 1); }
        catch { throw Error('素材存在跨域读取限制，无法安全录制画面。请下载原片后重新以本地文件导入。'); }
        if (sound === 'source') {
          const source = context.createMediaElementSource(clip.media), gain = context.createGain();
          gain.gain.value = 0; source.connect(gain); gain.connect(destination); nodes.push(source, gain);
          clip.gain = gain; clip.media.muted = false;
        }
        prepared.push(clip); duration += clip.duration;
        progress('prepare', 0, (i + 1) / (clips.length + (sound === 'music' ? 1 : 0)));
      }
      let music = null;
      if (sound === 'music') {
        music = await prepare(audio, 'audio', 0);
        const source = context.createMediaElementSource(music.media), gain = context.createGain();
        gain.gain.value = 0; source.connect(gain); gain.connect(destination); nodes.push(source, gain);
        music.gain = gain; music.media.muted = false;
      }
      const first = prepared[0].media;
      let scale = 1;
      if (resolution === '720') scale = Math.min(1, first.videoWidth >= first.videoHeight ? Math.min(1280 / first.videoWidth, 720 / first.videoHeight) : Math.min(720 / first.videoWidth, 1280 / first.videoHeight));
      width = Math.max(2, Math.floor(first.videoWidth * scale / 2) * 2);
      height = Math.max(2, Math.floor(first.videoHeight * scale / 2) * 2);
      if (width > 4096 || height > 4096 || width * height > 16000000) throw Error('原片分辨率超过本地导出的 4096 像素边长 / 1600 万像素限制，请改选 720p 后重试。');
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const canvasContext = canvas.getContext('2d', { alpha: false });
      const draw = media => {
        canvasContext.fillStyle = '#000'; canvasContext.fillRect(0, 0, width, height);
        const factor = Math.min(width / media.videoWidth, height / media.videoHeight);
        const w = media.videoWidth * factor, h = media.videoHeight * factor;
        canvasContext.drawImage(media, (width - w) / 2, (height - h) / 2, w, h);
      };
      draw(first);
      // A second explicit canvas read verifies the actual export surface.
      try { canvasContext.getImageData(0, 0, 1, 1); } catch { throw Error('画面受到跨域限制。请下载原片后重新以本地文件导入。'); }
      // Start capture only after the first media.play() has settled. A stream
      // created during preparation can retain an older first-frame timestamp,
      // which MediaRecorder may include as unwanted leading duration.
      const beginRecording = () => {
      const pictureStream = canvas.captureStream(30); streams.push(pictureStream);
      const outputStream = new MediaStream([...pictureStream.getVideoTracks(), ...(destination ? destination.stream.getAudioTracks() : [])]);
      streams.push(outputStream);
      const audioCodec = sound !== 'mute';
      const types = audioCodec
        ? ['video/mp4;codecs=avc1.42001f,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        : ['video/mp4;codecs=avc1.42001f', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      for (const mimeType of types) {
        if (!MediaRecorder.isTypeSupported(mimeType)) continue;
        try { recorder = new MediaRecorder(outputStream, { mimeType, videoBitsPerSecond: Math.max(2000000, Math.min(16000000, width * height * 4)), ...(audioCodec ? { audioBitsPerSecond: 192000 } : {}) }); recordedMime = mimeType; break; }
        catch { /* Try the next browser-supported codec. */ }
      }
      if (!recorder) throw Error('浏览器没有可用的视频编码器，请更新 Chrome / Edge 后重试。');
      recorder.addEventListener('dataavailable', event => { if (event.data?.size) chunks.push(event.data); });
      stopPromise = new Promise(resolve => recorder.addEventListener('stop', resolve, { once: true }));
      recorder.addEventListener('error', () => controller.abort(Error('浏览器编码失败。请改为 720p、减少片段数量后重试。')));
      };

      let musicPending = false;
      const stopMusic = () => { if (music) { music.media.pause(); music.gain.gain.value = 0; } };
      const syncMusic = time => {
        if (!music) return;
        const active = time >= music.offset && time < music.offset + music.duration;
        if (!active) { stopMusic(); return; }
        const target = music.in + time - music.offset;
        if (Math.abs(music.media.currentTime - target) > .2) music.media.currentTime = target;
        music.gain.gain.value = 1;
        if (music.media.paused && !musicPending) {
          musicPending = true;
          play(music.media).catch(error => controller.abort(error)).finally(() => { musicPending = false; });
        }
      };
      async function recordClip(clip) {
        check();
        await ready(clip.media, () => clip.media.readyState >= 3, ['canplay', 'loadeddata']);
        if (clip.gain) clip.gain.gain.value = 1;
        await play(clip.media);
        if (!recorder) beginRecording();
        if (recorder.state === 'inactive') recorder.start(250);
        else if (recorder.state === 'paused') recorder.resume();
        draw(clip.media);
        syncMusic(recorded);
        await new Promise((resolve, reject) => {
          let frame = null, timer = null, waiting = false, finished = false;
          const segmentStart = performance.now();
          let pausedDuration = 0;
          const cleanup = () => {
            if (frame !== null) cancelAnimationFrame(frame);
            clearTimeout(timer); clip.media.removeEventListener('waiting', stalled); clip.media.removeEventListener('error', failed);
            sessionSignal.removeEventListener('abort', abort);
          };
          const finish = error => { if (finished) return; finished = true; cleanup(); error ? reject(error) : resolve(); };
          const abort = () => finish(sessionSignal.reason || abortError());
          const failed = () => finish(Error(corsHint));
          const stalled = async () => {
            if (waiting || finished || clip.media.readyState >= 3) return;
            waiting = true; const waitStart = performance.now();
            if (recorder.state === 'recording') recorder.pause(); stopMusic();
            try {
              await ready(clip.media, () => clip.media.readyState >= 3, ['canplay', 'loadeddata']);
              if (finished) return;
              await play(clip.media);
              pausedDuration += performance.now() - waitStart;
              if (recorder.state === 'paused') recorder.resume(); waiting = false;
            } catch (error) { finish(error); }
          };
          const tick = () => {
            if (finished) return;
            if (sessionSignal.aborted) { abort(); return; }
            // Media currentTime may advance more slowly for a muted/offscreen
            // element. The recorded stream follows wall time, so use the same
            // active recording clock and correct source drift against it.
            const local = Math.max(0, (performance.now() - segmentStart - pausedDuration) / 1000);
            if (!waiting && local >= clip.duration - .008) { finish(); return; }
            if (clip.media.ended && clip.media.currentTime < clip.out - .06) { finish(Error('素材意外提前结束，请检查裁切范围后重试。')); return; }
            if (!waiting) {
              const expected = clip.in + Math.min(local, clip.duration);
              if (!clip.media.seeking && Math.abs(clip.media.currentTime - expected) > .09 && expected < clip.out - .015) clip.media.currentTime = expected;
              if (clip.media.readyState >= 2 && clip.media.currentTime <= clip.out + .015) draw(clip.media);
              syncMusic(recorded + local); progress('record', recorded + Math.min(local, clip.duration));
            }
            if (!finished) frame = requestAnimationFrame(tick);
          };
          clip.media.addEventListener('waiting', stalled); clip.media.addEventListener('error', failed, { once: true });
          sessionSignal.addEventListener('abort', abort, { once: true });
          timer = setTimeout(() => finish(Error('视频导出长时间没有完成。请下载原片后重新以本地文件导入。')), Math.max(30000, clip.duration * 1000 + 30000));
          frame = requestAnimationFrame(tick);
        });
        clip.media.pause(); if (clip.gain) clip.gain.gain.value = 0;
        if (recorder.state === 'recording') recorder.pause(); stopMusic();
        recorded += clip.duration;
        progress('record', recorded);
      }
      for (const clip of prepared) await recordClip(clip);
      check();
      progress('finish', duration, 1);
      recorder.stop();
      await guarded(stopPromise, 15000, '浏览器整理视频文件超时，请改为 720p 后重试。');
      check();
      const mime = recorder.mimeType || recordedMime;
      const blob = new Blob(chunks, { type: mime });
      if (!blob.size) throw Error('浏览器未输出有效视频，请改为 720p 后重试。');
      return { blob, extension: mime.startsWith('video/mp4') ? 'mp4' : 'webm', mime, width, height, duration };
    } finally {
      signal?.removeEventListener('abort', onAbort);
      document.removeEventListener('visibilitychange', onVisibility);
      // Cancel every pending event wait before releasing resources.
      if (!sessionSignal.aborted) controller.abort(abortError());
      for (const media of elements) { media.pause(); media.removeAttribute('src'); media.load(); }
      if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch {} }
      for (const stream of streams) for (const track of stream.getTracks()) track.stop();
      for (const node of nodes) { try { node.disconnect(); } catch {} }
      if (context && context.state !== 'closed') { try { await context.close(); } catch {} }
      container.remove();
    }
  }

  root.MSExporter = { exportSequence };
})(typeof globalThis !== 'undefined' ? globalThis : this);
