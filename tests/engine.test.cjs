'use strict';
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { Transport, clamp, sourceTime, timelineDuration, sanitizeRange } = require('../extension/engine.js');

class FakeMedia extends EventTarget {
  constructor(duration = 10) {
    super();
    this.duration = duration;
    this._time = 0;
    this.paused = true;
    this.muted = true;
    this.volume = 1;
    this.playbackRate = 1;
    this.readyState = 4;
    this.networkState = 1;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.seekCalls = 0;
    this.rejectPlay = null;
  }
  get currentTime() { return this._time; }
  set currentTime(value) { this._time = value; this.seekCalls += 1; }
  play() {
    this.playCalls += 1;
    if (this.rejectPlay) return Promise.reject(this.rejectPlay);
    this.paused = false;
    return Promise.resolve();
  }
  pause() { this.paused = true; this.pauseCalls += 1; }
  emit(name) { this.dispatchEvent(new Event(name)); }
}
class FakeClock {
  constructor() {
    this.now = 0;
    this.serial = 0;
    this.frames = new Map();
    this.timers = new Map();
    this.media = [];
    this.originals = Object.fromEntries(['performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const install = (key, value) => Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    install('performance', { now: () => this.now });
    install('requestAnimationFrame', callback => { const id = ++this.serial; this.frames.set(id, callback); return id; });
    install('cancelAnimationFrame', id => this.frames.delete(id));
    install('setTimeout', (callback, delay) => { const id = ++this.serial; this.timers.set(id, { callback, at: this.now + delay }); return id; });
    install('clearTimeout', id => this.timers.delete(id));
  }
  advance(ms, tickMedia = true) {
    this.now += ms;
    if (tickMedia) for (const media of this.media) {
      if (!media.paused && media.readyState >= 3) media._time = Math.min(media.duration, media._time + ms / 1000 * media.playbackRate);
    }
    for (const [id, timer] of [...this.timers]) {
      if (timer.at <= this.now) { this.timers.delete(id); timer.callback(); }
    }
    const frames = [...this.frames];
    this.frames.clear();
    for (const [, callback] of frames) callback(this.now);
  }
  restore() {
    for (const [key, descriptor] of Object.entries(this.originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

let clock;
let transports;
beforeEach(() => { clock = new FakeClock(); transports = []; });
afterEach(() => { for (const transport of transports) transport.destroy(); clock.restore(); });
function create(options) {
  const transport = new Transport(options);
  transports.push(transport);
  return transport;
}
function track(id, start = 0, end = 10, offset = 0, enabled = true) {
  const media = new FakeMedia(Math.max(end, 10));
  clock.media.push(media);
  return { id, media, in: start, out: end, offset, enabled };
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≠ ${expected}`);

test('range helpers clamp corrupt input and preserve trim/offset semantics', () => {
  assert.equal(clamp(NaN, 0, 10), 0);
  assert.equal(clamp(Infinity, 0, 10), 10);
  assert.equal(clamp(-Infinity, 0, 10), 0);
  assert.deepEqual(sanitizeRange(10, -2, 30, -4), { in: 0, out: 10, offset: 0 });
  assert.deepEqual(sanitizeRange(10, 8, 3, 2), { in: 8, out: 8, offset: 2 });
  assert.deepEqual(sanitizeRange(NaN, 2, 8, 1), { in: 2, out: 8, offset: 1 });
  assert.deepEqual(sanitizeRange(10, 2, undefined, 1), { in: 2, out: 10, offset: 1 });
  assert.deepEqual(sanitizeRange(10, 2, Infinity, 1), { in: 2, out: 10, offset: 1 });
  const a = { in: 2, out: 6, offset: 3 };
  assert.equal(sourceTime(a, 0), 2);
  assert.equal(sourceTime(a, 4), 3);
  assert.equal(sourceTime(a, 20), 6);
  assert.equal(timelineDuration([a, { in: 0, out: 100, offset: 50, enabled: false }]), 7);
  assert.equal(timelineDuration([{ in: 5, out: 5, offset: 100 }]), 0);
});

test('trimmed tracks enter their offset window together and park at endpoints', async () => {
  const a = track('A', 2, 6, 1);
  const b = track('B', 0, 8);
  const player = create();
  player.loop = false;
  player.setTracks([a, b]);
  player.setSound('A');
  await player.play();
  assert.equal(a.media.currentTime, 2);
  assert.equal(a.media.paused, true);
  assert.equal(a.media.muted, true);
  clock.advance(1500);
  close(a.media.currentTime, 2.5);
  assert.equal(a.media.paused, false);
  assert.equal(a.media.muted, false);
  assert.equal(b.media.muted, true);
  clock.advance(4000);
  assert.equal(a.media.currentTime, 6);
  assert.equal(a.media.paused, true);
  assert.equal(a.media.muted, true);
  close(b.media.currentTime, 5.5);
});

test('disabled tracks never play, make sound or extend duration', async () => {
  const a = track('A', 0, 3);
  const disabled = track('B', 0, 100, 40, false);
  const player = create();
  player.setTracks([a, disabled]);
  player.setSound('B');
  await player.play();
  assert.equal(player.duration, 3);
  assert.equal(disabled.media.playCalls, 0);
  assert.equal(disabled.media.muted, true);
  player.seek(2);
  assert.equal(disabled.media.paused, true);
});

test('seek and refresh respect changed ranges without restarting a paused transport', () => {
  const a = track('A', 2, 8, 1);
  const player = create();
  player.setTracks([a]);
  player.seek(4);
  assert.equal(a.media.currentTime, 5);
  a.in = 4; a.out = 6; a.offset = 2;
  player.refresh();
  assert.equal(player.duration, 4);
  assert.equal(player.time, 4);
  assert.equal(a.media.currentTime, 6);
  assert.equal(a.media.playCalls, 0);
  assert.equal(clock.frames.size, 0);
});

test('rate changes preserve master position and affect every media element', async () => {
  const a = track('A');
  const player = create();
  player.setTracks([a]);
  await player.play();
  clock.advance(1000);
  player.setRate(2);
  close(player.time, 1);
  clock.advance(500);
  close(player.time, 2);
  close(a.media.currentTime, 2);
  player.setRate(99);
  assert.equal(player.rate, 4);
  player.setVolume(3);
  assert.equal(a.media.volume, 1);
  player.setVolume(-2);
  assert.equal(a.media.volume, 0);
});

test('drift smaller than 100ms is tolerated; larger drift is corrected', async () => {
  const a = track('A');
  const player = create();
  player.setTracks([a]);
  await player.play();
  a.media._time = 0.06;
  const before = a.media.seekCalls;
  clock.advance(50, false);
  assert.equal(a.media.seekCalls, before);
  a.media._time = 0;
  clock.advance(150, false);
  close(a.media.currentTime, 0.2);
  assert.equal(a.media.seekCalls, before + 1);
});

test('loop wraps trimmed media; stopping at end has no scheduled background work', async () => {
  const a = track('A', 2, 4);
  const player = create();
  player.setTracks([a]);
  await player.play();
  clock.advance(2500);
  close(player.time, 0.5);
  close(a.media.currentTime, 2.5);
  player.loop = false;
  clock.advance(2000);
  assert.equal(player.time, 2);
  assert.equal(a.media.currentTime, 4);
  assert.equal(player.playing, false);
  assert.equal(clock.frames.size, 0);
  assert.equal(clock.timers.size, 0);
  assert.equal(a.media.paused, true);
});

test('waiting freezes all tracks and resumes the same master position on canplay', async () => {
  const a = track('A');
  const b = track('B');
  const states = [];
  const player = create({ onState: state => states.push(state) });
  player.setTracks([a, b]);
  await player.play();
  clock.advance(1000);
  a.media.readyState = 2;
  a.media.emit('waiting');
  assert.equal(player.buffering, true);
  assert.equal(a.media.paused, true);
  assert.equal(b.media.paused, true);
  assert.equal(clock.frames.size, 0);
  clock.advance(7000);
  assert.equal(player.time, 1);
  a.media.readyState = 4;
  a.media.emit('canplay');
  assert.equal(player.buffering, false);
  assert.equal(clock.timers.size, 0);
  assert.equal(a.media.paused, false);
  assert.equal(b.media.paused, false);
  clock.advance(500);
  close(player.time, 1.5);
  assert.ok(states.some(state => state.buffering));
});

test('initial buffering has a visible timeout and releases all pending work', async () => {
  const a = track('A');
  a.media.readyState = 1;
  const errors = [];
  const player = create({ onError: error => errors.push(error) });
  player.setTracks([a]);
  await player.play();
  assert.equal(player.buffering, true);
  clock.advance(20001);
  assert.equal(player.playing, false);
  assert.equal(player.buffering, false);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /20 秒/);
  assert.equal(clock.frames.size, 0);
  assert.equal(clock.timers.size, 0);
});

test('play rejection is visible and pauses the whole comparison', async () => {
  const a = track('A');
  const b = track('B');
  b.media.rejectPlay = Object.assign(new Error('Denied'), { name: 'NotAllowedError' });
  const errors = [];
  const player = create({ onError: error => errors.push(error) });
  player.setTracks([a, b]);
  const result = await player.play();
  assert.equal(result, false);
  assert.equal(player.playing, false);
  assert.equal(a.media.paused, true);
  assert.equal(b.media.paused, true);
  assert.match(errors[0], /浏览器阻止/);
  assert.equal(clock.frames.size, 0);
});

test('manual pause makes a late play rejection harmless', async () => {
  const a = track('A');
  let reject;
  a.media.play = () => new Promise((resolve, fail) => { reject = fail; });
  const errors = [];
  const player = create({ onError: error => errors.push(error) });
  player.setTracks([a]);
  const started = player.play();
  player.pause();
  reject(Object.assign(new Error('Interrupted'), { name: 'AbortError' }));
  await started;
  assert.equal(errors.length, 0);
  assert.equal(player.playing, false);
  assert.equal(clock.frames.size, 0);
});

test('removing a buffering track unblocks remaining tracks and detaches its events', async () => {
  const a = track('A');
  const b = track('B');
  const errors = [];
  const player = create({ onError: error => errors.push(error) });
  player.setTracks([a, b]);
  await player.play();
  b.media.readyState = 2;
  b.media.emit('waiting');
  player.setTracks([a]);
  assert.equal(player.buffering, false);
  assert.equal(player.playing, true);
  assert.equal(b.media.paused, true);
  assert.equal(b.media.muted, true);
  b.media.emit('error');
  assert.equal(errors.length, 0);
  assert.equal(player.playing, true);
});

test('destroy during buffer releases timers, listeners and tracks; future play is inert', async () => {
  const a = track('A');
  a.media.readyState = 1;
  const errors = [];
  const player = create({ onError: error => errors.push(error) });
  player.setTracks([a]);
  await player.play();
  player.destroy();
  a.media.readyState = 4;
  a.media.emit('canplay');
  a.media.emit('error');
  clock.advance(30000);
  assert.equal(clock.frames.size, 0);
  assert.equal(clock.timers.size, 0);
  assert.equal(errors.length, 0);
  assert.equal(player.tracks.length, 0);
  assert.equal(await player.play(), false);
});

test('empty selection cannot start a clock and reports a useful error', async () => {
  const errors = [];
  const player = create({ onError: error => errors.push(error) });
  assert.equal(await player.play(), false);
  assert.match(errors[0], /加入视频/);
  assert.equal(clock.frames.size, 0);
});

test('multiple source segments map cumulative time and skip removed gaps with an offset', () => {
  const segmented = { in: 0, out: 10, offset: 1, segments: [{ in: 2, out: 3 }, { in: 5, out: 6.5 }] };
  assert.equal(timelineDuration([segmented]), 3.5);
  assert.equal(sourceTime(segmented, 0), 2);
  assert.equal(sourceTime(segmented, 1.75), 2.75);
  assert.equal(sourceTime(segmented, 2), 5);
  assert.equal(sourceTime(segmented, 3), 6);
  assert.equal(sourceTime(segmented, 100), 6.5);
  assert.equal(timelineDuration([{ ...segmented, segments: [] }]), 0);
  assert.equal(timelineDuration([{ ...segmented, enabled: false }]), 0);
  assert.equal(timelineDuration([{ media: { duration: 6 }, segments: [{ in: 2, out: 3 }, { in: 5, out: 99 }] }]), 2);
});

test('a gap shorter than drift tolerance is still skipped at the segment boundary', async () => {
  const a = track('A');
  a.segments = [{ in: 0, out: .5 }, { in: .54, out: 1.04 }];
  const player = create(); player.loop = false; player.setTracks([a]);
  await player.play();
  clock.advance(500);
  close(a.media.currentTime, .54);
  clock.advance(250);
  close(a.media.currentTime, .79);
  clock.advance(250);
  close(player.time, 1);
  close(a.media.currentTime, 1.04);
  assert.equal(a.media.paused, true);
  assert.equal(clock.frames.size, 0);
});

test('disabled and empty-segment tracks preserve the frame instead of seeking', async () => {
  const a = track('A');
  const disabled = track('B', 2, 6, 0, false); disabled.media._time = 7;
  const empty = track('C'); empty.segments = []; empty.media._time = 8;
  const player = create(); player.setTracks([a, disabled, empty]);
  await player.play(); player.seek(3); clock.advance(500);
  assert.equal(disabled.media.currentTime, 7);
  assert.equal(empty.media.currentTime, 8);
  assert.equal(disabled.media.seekCalls, 0);
  assert.equal(empty.media.seekCalls, 0);
  assert.equal(disabled.media.paused, true);
  assert.equal(empty.media.paused, true);
});

test('late play resolution cannot restart a newly disabled, removed or destroyed source', async () => {
  for (const action of ['disable', 'remove', 'destroy']) {
    const a = track('A'), b = track('B'); let finish;
    a.media.play = () => new Promise(resolve => { finish = () => { a.media.paused = false; resolve(); }; });
    const player = create(); player.setTracks([a, b]);
    const started = player.play();
    if (action === 'disable') { a.enabled = false; player.refresh(); }
    if (action === 'remove') player.setTracks([b]);
    if (action === 'destroy') player.destroy();
    finish(); await started;
    assert.equal(a.media.paused, true, action);
    assert.equal(a.media.muted, true, action);
    player.destroy();
  }
  assert.equal(clock.frames.size, 0);
});
