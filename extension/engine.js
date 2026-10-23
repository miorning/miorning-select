/* Copyright (C) 2026 MIORNING. SPDX-License-Identifier: GPL-3.0-only */
/* 喵咛选片台 — local media transport. No page hooks, network or dependencies. */
(function (root) {
  'use strict';
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isNaN(Number(value)) ? min : Number(value)));

  function sanitizeRange(duration, start, end, offset) {
    const knownDuration = Number.isFinite(Number(duration)) && Number(duration) > 0;
    const limit = knownDuration ? Number(duration) : Math.max(0, finite(end, finite(start)));
    const from = clamp(start, 0, limit);
    return { in: from, out: clamp(end == null ? limit : end, from, limit), offset: Math.max(0, finite(offset)) };
  }
  function rangeFor(track) {
    const duration = track.media?.duration ?? track.duration;
    const ranges = Array.isArray(track.segments) ? track.segments : [{ in: track.in, out: track.out }];
    const segments = ranges.filter(Boolean).map(segment => sanitizeRange(duration, segment.in, segment.out, 0)).filter(segment => segment.out > segment.in);
    return {
      in: segments[0]?.in ?? 0,
      out: segments.at(-1)?.out ?? 0,
      offset: Math.max(0, finite(track.offset)),
      segments,
      length: segments.reduce((sum, segment) => sum + segment.out - segment.in, 0),
    };
  }
  function sourcePosition(track, time) {
    const range = rangeFor(track);
    let remaining = clamp(finite(time) - range.offset, 0, range.length);
    for (let index = 0; index < range.segments.length; index++) {
      const segment = range.segments[index], length = segment.out - segment.in;
      if (remaining < length || index === range.segments.length - 1) return { time: clamp(segment.in + remaining, segment.in, segment.out), index };
      remaining -= length;
    }
    return { time: 0, index: -1 };
  }
  function sourceTime(track, time) { return sourcePosition(track, time).time; }
  function timelineDuration(tracks) {
    return (tracks || []).reduce((end, track) => {
      if (track.enabled === false) return end;
      const range = rangeFor(track);
      return range.length > 0 ? Math.max(end, range.offset + range.length) : end;
    }, 0);
  }

  class Transport {
    constructor({ onTick, onState, onError } = {}) {
      this.tracks = [];
      this.time = 0;
      this.playing = false;
      this.buffering = false;
      this.loop = true;
      this.rate = 1;
      this.soundId = null;
      this.volume = 0.8;
      this.onTick = typeof onTick === 'function' ? onTick : () => {};
      this.onState = typeof onState === 'function' ? onState : () => {};
      this.onError = typeof onError === 'function' ? onError : () => {};
      this._raf = null;
      this._bufferTimer = null;
      this._originTime = 0;
      this._origin = this._now();
      this._epoch = 0;
      this._pending = new Map();
      this._lastSegment = new WeakMap();
      this._listeners = [];
      this._destroyed = false;
      this._frame = this._frame.bind(this);
    }

    get duration() { return timelineDuration(this.tracks); }
    _now() { return root.performance?.now?.() ?? Date.now(); }
    _request(callback) {
      return root.requestAnimationFrame ? root.requestAnimationFrame(callback) : root.setTimeout(() => callback(this._now()), 16);
    }
    _cancel(id) {
      if (root.cancelAnimationFrame) root.cancelAnimationFrame(id);
      else root.clearTimeout(id);
    }
    _tick() { this.onTick({ time: this.time, duration: this.duration, playing: this.playing, buffering: this.buffering }); }
    _state() { this.onState({ playing: this.playing, buffering: this.buffering }); }
    _resetClock() { this._originTime = this.time; this._origin = this._now(); }
    _readClock() {
      if (this.playing && !this.buffering) this.time = clamp(this._originTime + (this._now() - this._origin) / 1000 * this.rate, 0, this.duration);
    }
    _active(track) {
      const range = rangeFor(track);
      return track.enabled !== false && range.length > 0 && this.time >= range.offset && this.time < range.offset + range.length;
    }
    _stopFrame() {
      if (this._raf !== null) this._cancel(this._raf);
      this._raf = null;
    }
    _schedule() {
      if (!this._destroyed && this.playing && !this.buffering && this._raf === null) this._raf = this._request(this._frame);
    }
    _clearBufferTimer() {
      if (this._bufferTimer !== null) root.clearTimeout(this._bufferTimer);
      this._bufferTimer = null;
    }
    _pauseMedia() {
      this._epoch += 1;
      this._pending.clear();
      for (const track of this.tracks) {
        track.media.pause();
        track.media.muted = true;
      }
    }
    _fail(message) {
      if (this._destroyed) return;
      this.pause();
      this.onError(String(message));
    }
    _seekMedia(track, force) {
      if (track.enabled === false) return;
      const position = sourcePosition(track, this.time);
      if (position.index < 0) return;
      // A short removed gap must still be skipped, even below drift tolerance.
      force ||= this._lastSegment.get(track.media) !== position.index;
      this._lastSegment.set(track.media, position.index);
      const target = position.time;
      const difference = Math.abs(finite(track.media.currentTime) - target);
      if (difference <= (force ? 0.005 : 0.1)) return;
      try { track.media.currentTime = target; }
      catch (error) {
        this._fail(`无法定位片段 ${track.id}：${error?.message || '此视频不支持跳转时间。'}`);
      }
    }
    _startMedia(track) {
      const media = track.media;
      if (!media.paused || this._pending.has(media)) return this._pending.get(media);
      const epoch = this._epoch;
      let result;
      try { result = media.play(); }
      catch (error) { result = Promise.reject(error); }
      const pending = Promise.resolve(result).then(() => {
        const current = this.tracks.find(item => item.media === media);
        if (this._destroyed || !this.playing || this.buffering || !current || !this._active(current)) {
          media.pause(); media.muted = true;
        }
      }).catch(error => {
        if (this._destroyed || epoch !== this._epoch || !this.playing || !this._active(track)) return;
        const hint = error?.name === 'NotAllowedError'
          ? '浏览器阻止了播放，请再次点击播放；有声播放需要手动触发。'
          : (error?.message || '请检查视频是否仍可访问。');
        this._fail(`片段 ${track.id} 播放失败：${hint}`);
      }).finally(() => {
        if (this._pending.get(media) === pending) this._pending.delete(media);
      });
      this._pending.set(media, pending);
      return pending;
    }

    _enterBuffering() {
      if (this._destroyed || !this.playing || this.buffering) return;
      // The current master position is already sampled by the caller. Freeze it.
      this.buffering = true;
      this._stopFrame();
      this._pauseMedia();
      for (const track of this.tracks) {
        if (this._active(track)) {
          track.media.preload = 'auto';
          // An empty element may not start loading until requested. Do not reload
          // media that is already fetching, since that discards its seek position.
          if (track.media.networkState === 0 && typeof track.media.load === 'function') track.media.load();
        }
      }
      this._bufferTimer = root.setTimeout(() => {
        this._bufferTimer = null;
        if (this.buffering && this.playing) this._fail('视频缓冲超过 20 秒，已暂停。请确认原视频可播放后重试，或暂时屏蔽未就绪的片段。');
      }, 20000);
      this._state();
      this._tick();
    }
    _checkBuffering() {
      if (!this.playing || !this.buffering || this._destroyed) return;
      if (this.tracks.some(track => this._active(track) && track.media.readyState < 3)) return;
      this._clearBufferTimer();
      this.buffering = false;
      this._resetClock();
      this._state();
      this._sync(true);
      this._tick();
      this._schedule();
    }

    _sync(force = false) {
      if (this._destroyed) return [];
      const needsBuffer = this.playing && this.tracks.some(track => this._active(track) && track.media.readyState < 3);
      if (needsBuffer) this._enterBuffering();
      const pending = [];
      for (const track of this.tracks) {
        const media = track.media;
        const active = this._active(track);
        media.playbackRate = this.rate;
        media.volume = this.volume;
        media.muted = this.soundId !== track.id || !active || !this.playing || this.buffering;
        if (!active || !this.playing || this.buffering) media.pause();
        this._seekMedia(track, force);
        if (this._destroyed || !this.playing) continue;
        if (active && !this.buffering) {
          if (media.error) {
            this._fail(`片段 ${track.id} 无法解码或载入，错误代码 ${media.error.code || '未知'}。`);
            break;
          }
          const promise = this._startMedia(track);
          if (promise) pending.push(promise);
        }
      }
      return pending;
    }

    setTracks(tracks) {
      if (this._destroyed) return;
      this._readClock();
      this._pauseMedia();
      for (const remove of this._listeners) remove();
      this._listeners = [];
      const mediaSeen = new Set();
      this.tracks = (tracks || []).filter(track => {
        if (!track?.media || track.id == null || mediaSeen.has(track.media)) return false;
        mediaSeen.add(track.media); return true;
      });
      for (const track of this.tracks) {
        const media = track.media;
        const listen = (type, handler) => {
          media.addEventListener(type, handler);
          this._listeners.push(() => media.removeEventListener(type, handler));
        };
        const wait = () => {
          if (!this.playing || !this._active(track) || media.readyState >= 3) return;
          this._readClock();
          this._enterBuffering();
        };
        listen('waiting', wait);
        listen('stalled', wait);
        listen('canplay', () => this._checkBuffering());
        listen('progress', () => this._checkBuffering());
        listen('loadeddata', () => this._checkBuffering());
        listen('loadedmetadata', () => this.refresh());
        listen('playing', () => {
          if (!this.playing || this.buffering || !this._active(track)) { media.pause(); media.muted = true; }
        });
        listen('error', () => {
          if (track.enabled !== false) this._fail(`片段 ${track.id} 无法载入。链接可能已过期，或格式不受浏览器支持。`);
        });
      }
      this.refresh();
    }

    refresh() {
      if (this._destroyed) return;
      this._readClock();
      this.time = clamp(this.time, 0, this.duration);
      this._resetClock();
      if (this.duration <= 0 && this.playing) { this.pause(); return; }
      this._sync(true);
      this._checkBuffering();
      this._tick();
      this._schedule();
    }
    seek(time) {
      if (this._destroyed) return;
      this.time = clamp(time, 0, this.duration);
      this._resetClock();
      this._sync(true);
      this._checkBuffering();
      this._tick();
      this._schedule();
    }
    async play() {
      if (this._destroyed) return false;
      if (this.playing) return true;
      if (this.duration <= 0) { this.onError('还没有可播放的片段，请加入视频并设置有效区间。'); return false; }
      if (this.time >= this.duration) this.time = 0;
      this.playing = true;
      this.buffering = false;
      this._resetClock();
      this._state();
      const pending = this._sync(true);
      this._tick();
      this._schedule();
      await Promise.all(pending);
      return this.playing;
    }
    pause() {
      if (this._destroyed) return;
      this._readClock();
      const changed = this.playing || this.buffering;
      this.playing = false;
      this.buffering = false;
      this._stopFrame();
      this._clearBufferTimer();
      this._pauseMedia();
      if (changed) this._state();
      this._tick();
    }
    setRate(rate) {
      if (this._destroyed) return;
      this._readClock();
      this.rate = clamp(rate, 0.1, 4);
      this._resetClock();
      // Changing a setting must not discard a manually previewed source frame.
      // Position changes belong to seek/refresh and the running master clock.
      for (const track of this.tracks) track.media.playbackRate = this.rate;
      this._tick();
    }
    setSound(id) {
      if (this._destroyed) return;
      this.soundId = id == null ? null : id;
      for (const track of this.tracks) {
        track.media.muted = this.soundId !== track.id || !this._active(track) || !this.playing || this.buffering;
      }
    }
    setVolume(volume) {
      if (this._destroyed) return;
      this.volume = clamp(volume, 0, 1);
      for (const track of this.tracks) track.media.volume = this.volume;
    }
    _frame() {
      this._raf = null;
      if (this._destroyed || !this.playing || this.buffering) return;
      const duration = this.duration;
      if (duration <= 0) { this.pause(); return; }
      const position = this._originTime + (this._now() - this._origin) / 1000 * this.rate;
      let wrapped = false;
      if (position >= duration) {
        if (!this.loop) {
          this.time = duration;
          this.playing = false;
          this._pauseMedia();
          this._sync(true);
          this._state();
          this._tick();
          return;
        }
        this.time = position % duration;
        this._resetClock();
        wrapped = true;
      } else this.time = position;
      this._sync(wrapped);
      this._tick();
      this._schedule();
    }
    destroy() {
      if (this._destroyed) return;
      this.pause();
      for (const remove of this._listeners) remove();
      this._listeners = [];
      this.tracks = [];
      this._destroyed = true;
      this.onTick = this.onState = this.onError = () => {};
    }
  }

  const API = { Transport, clamp, sourceTime, timelineDuration, sanitizeRange };
  root.MSCore = API;
  if (typeof module === 'object' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
