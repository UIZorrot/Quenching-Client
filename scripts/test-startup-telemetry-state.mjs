// Exercise the real persistent startup service without launching Electron,
// touching real userData, contacting production, or installing process hooks.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';

const result = await build({ entryPoints: ['src/Main/services/startup-telemetry.ts'], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false });
const require = createRequire(import.meta.url);
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-telemetry-migration-'));
const statePath = path.join(root, 'telemetry/startup-events.json');
const readState = async () => JSON.parse(await fs.readFile(statePath, 'utf8'));
const timers = new Set();
const requests = [];
function instance(fetchImpl, immediateTimeout = false) {
  const app = new EventEmitter(); app.getPath = () => root; app.getVersion = () => '3.5.1';
  const module = { exports: {} };
  const requestedTimeouts = [];
  const fakeProcess = { platform: process.platform, arch: process.arch, on() {} };
  const fetch = async (url, init) => {
    const events = JSON.parse(init.body).events;
    requests.push({ url, method: init.method, events });
    assert.equal(url, 'https://qm.txzy.net/v1/telemetry/events');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['Content-Type'], 'application/json');
    return fetchImpl(events, init);
  };
  const timer = (callback, delay) => {
    requestedTimeouts.push(delay);
    const handle = setTimeout(callback, immediateTimeout ? 5 : delay); timers.add(handle); return handle;
  };
  new Function('require', 'module', 'exports', 'process', 'fetch', 'setTimeout', 'clearTimeout', result.outputFiles[0].text)(
    name => name === 'electron' ? { app } : require(name), module, module.exports, fakeProcess, fetch, timer, clearTimeout);
  return { telemetry: module.exports.startupTelemetry, requestedTimeouts, app };
}
const stopTimers = () => { for (const timer of timers) clearTimeout(timer); timers.clear(); };
const ack = (accepted, inserted = accepted, duplicates = []) => ({ status: 200, json: async () => ({ acceptedEventIds: accepted, insertedEventIds: inserted, duplicateEventIds: duplicates }) });

try {
  // Queue created by an old client is read unchanged; backend migration does
  // not change storage schema, anonymous install identity, or queued IDs.
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify({ schemaVersion: 1, anonymousInstallId: 'existing-install', currentSession: null, events: [{
    id: 'existing-queued-event', anonymousInstallId: 'existing-install', sessionId: 'old-session', name: 'startup_success',
    timestamp: new Date().toISOString(), appVersion: '3.5.1', platform: process.platform, arch: process.arch, osRelease: 'test'
  }] }));
  const failed = instance(async events => ({ status: 503, json: async () => ({ acceptedEventIds: events.map(event => event.id), insertedEventIds: [], duplicateEventIds: [] }) }));
  failed.telemetry.markStartupSuccess();
  const pendingBefore = (await readState()).events;
  await failed.telemetry.uploadOnce();
  assert.deepEqual((await readState()).events, pendingBefore, 'non-200 must retain persistent queue even if the response contains IDs');
  assert.ok(requests[0].events.some(event => event.id === 'existing-queued-event'));
  assert.ok(requests[0].events.every(event => event.anonymousInstallId === 'existing-install'));
  assert.ok(failed.requestedTimeouts.every(value => value === 1500));
  failed.app.emit('before-quit'); stopTimers();

  const restarted = instance(async events => {
    assert.ok(events.some(event => event.id === 'existing-queued-event'));
    // Backend recognizes an already persisted ID and acknowledges a duplicate.
    return ack(['existing-queued-event', 'unsubmitted-id'], [], ['existing-queued-event']);
  });
  restarted.telemetry.markStartupSuccess();
  const retryQueue = (await readState()).events;
  await restarted.telemetry.uploadOnce();
  const afterPartialAck = await readState();
  assert.equal(afterPartialAck.anonymousInstallId, 'existing-install');
  assert.deepEqual(afterPartialAck.events.map(event => event.id), retryQueue.map(event => event.id).filter(id => id !== 'existing-queued-event'));
  for (const event of pendingBefore.filter(event => event.id !== 'existing-queued-event')) assert.ok(afterPartialAck.events.some(retained => retained.id === event.id), 'restart must not regenerate old event IDs');
  restarted.app.emit('before-quit'); stopTimers();

  const offline = instance(async () => { throw new Error('network offline'); });
  const beforeOffline = (await readState()).events;
  await offline.telemetry.uploadOnce();
  assert.deepEqual((await readState()).events, beforeOffline);
  offline.app.emit('before-quit'); stopTimers();

  const timedOut = instance(async (_events, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
  }), true);
  const beforeTimeout = (await readState()).events;
  // The production timeout stays 1500 ms; only this fixture accelerates firing.
  const keepAlive = setTimeout(() => {}, 1000);
  try { await timedOut.telemetry.uploadOnce(); } finally { clearTimeout(keepAlive); }
  assert.deepEqual(timedOut.requestedTimeouts, [1500]);
  assert.deepEqual((await readState()).events, beforeTimeout);
  timedOut.app.emit('before-quit'); stopTimers();

  // A lost ACK is safe: retry the same IDs and delete only after the backend
  // returns a valid HTTP 200 acknowledgement, including duplicate IDs.
  const durableIds = new Set();
  const lostAck = instance(async events => { events.forEach(event => durableIds.add(event.id)); throw new Error('connection lost after server persisted'); });
  const beforeLostAck = (await readState()).events;
  await lostAck.telemetry.uploadOnce();
  assert.deepEqual((await readState()).events, beforeLostAck);
  lostAck.app.emit('before-quit'); stopTimers();
  let lateEventId;
  const recovered = instance(async events => {
    const duplicates = events.filter(event => durableIds.has(event.id)).map(event => event.id);
    const inserted = events.filter(event => !durableIds.has(event.id)).map(event => event.id);
    // A crash queued while POST is pending must not be consumed by this batch.
    recovered.telemetry.recordCrash('renderer', 'crashed', undefined, 9);
    lateEventId = (await readState()).events.at(-1).id;
    return ack([...inserted, ...duplicates, lateEventId], inserted, duplicates);
  });
  await recovered.telemetry.uploadOnce();
  const remaining = await readState();
  assert.deepEqual(remaining.events.map(event => event.id), [lateEventId]);
  assert.equal(remaining.anonymousInstallId, 'existing-install');
  assert.ok(requests.every(request => request.url === 'https://qm.txzy.net/v1/telemetry/events'));
  assert.ok(requests.slice(1).some(request => request.events.some(event => event.id === 'existing-queued-event')));
  console.log(JSON.stringify({ ok: true, productionEndpoint: 'https://qm.txzy.net/v1/telemetry/events',
    cases: ['existing queue/schema/anonymous ID retained', 'POST JSON protocol', '1500ms timeout unchanged', '503/timeout/offline retained',
      'restart retries same IDs', 'partial ACK removes only confirmed IDs', 'lost ACK/duplicate retry', 'events queued in flight retained'],
    productionRequests: 0, realUserDataModified: false }, null, 2));
} finally { stopTimers(); await fs.rm(root, { recursive: true, force: true }); }
