import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  createStartupTelemetryBatch,
  removeAcceptedStartupEvents,
  uploadStartupTelemetryBatch,
  type UploadableStartupEvent
} from '../src/Main/services/startup-telemetry-uploader';

const installA = 'install-a';
const installB = 'install-b';

function event(
  id: string,
  anonymousInstallId = installA,
  extra: Record<string, unknown> = {}
): UploadableStartupEvent {
  return { id, anonymousInstallId, name: 'startup_success', ...extra };
}

async function run(): Promise<void> {
  const moreThanForty = Array.from({ length: 45 }, (_, index) => event(`event-${index}`));
  assert.equal(createStartupTelemetryBatch(moreThanForty).length, 40);

  const mixedInstalls = [event('a-1'), event('b-1', installB), event('a-2')];
  assert.deepEqual(
    createStartupTelemetryBatch(mixedInstalls).map(item => item.id),
    ['a-1', 'a-2']
  );

  const largeEvents = Array.from({ length: 40 }, (_, index) =>
    event(`large-${index}`, installA, { details: { message: '汉'.repeat(5000) } })
  );
  const sizeLimitedBatch = createStartupTelemetryBatch(largeEvents);
  assert.ok(sizeLimitedBatch.length > 0 && sizeLimitedBatch.length < 40);
  assert.ok(
    Buffer.byteLength(JSON.stringify({ events: sizeLimitedBatch }), 'utf8') <= 96 * 1024
  );

  let postedHeaders: Record<string, string> | undefined;
  const success = await uploadStartupTelemetryBatch({
    events: [event('inserted'), event('duplicate')],
    endpoint: 'https://example.test/events',
    timeoutMs: 50,
    fetchImpl: async (_url, init) => {
      postedHeaders = init.headers;
      return {
        status: 200,
        json: async () => ({
          acceptedEventIds: ['inserted', 'duplicate', 'not-in-batch'],
          insertedEventIds: ['inserted'],
          duplicateEventIds: ['duplicate']
        })
      };
    }
  });
  assert.deepEqual(success.acceptedEventIds, ['inserted', 'duplicate']);
  assert.deepEqual(postedHeaders, { 'Content-Type': 'application/json' });
  assert.deepEqual(
    removeAcceptedStartupEvents(
      [event('inserted'), event('duplicate'), event('queued-later')],
      success.acceptedEventIds
    ).map(item => item.id),
    ['queued-later']
  );

  let requestBody = '';
  let requestHeaders: Record<string, string | string[] | undefined> = {};
  const server = createServer((request, response) => {
    requestHeaders = request.headers;
    request.setEncoding('utf8');
    request.on('data', chunk => {
      requestBody += chunk;
    });
    request.on('end', () => {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        acceptedEventIds: ['real-http'],
        insertedEventIds: ['real-http'],
        duplicateEventIds: []
      }));
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const realHttp = await uploadStartupTelemetryBatch({
      events: [event('real-http')],
      endpoint: `http://127.0.0.1:${address.port}/v1/telemetry/events`,
      timeoutMs: 500
    });
    assert.deepEqual(realHttp.acceptedEventIds, ['real-http']);
    assert.equal(requestHeaders['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(requestBody), { events: [event('real-http')] });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close(error => error ? reject(error) : resolve())
    );
  }

  for (const response of [
    { status: 500, json: async () => ({}) },
    { status: 200, json: async () => ({ acceptedEventIds: ['inserted'] }) }
  ]) {
    const retained = await uploadStartupTelemetryBatch({
      events: [event('inserted')],
      endpoint: 'https://example.test/events',
      timeoutMs: 50,
      fetchImpl: async () => response
    });
    assert.deepEqual(retained.acceptedEventIds, []);
  }

  const keepAlive = setTimeout(() => undefined, 100);
  const timedOut = await uploadStartupTelemetryBatch({
    events: [event('timeout')],
    endpoint: 'https://example.test/events',
    timeoutMs: 10,
    fetchImpl: async (_url, init) =>
      await new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      })
  });
  clearTimeout(keepAlive);
  assert.deepEqual(timedOut.acceptedEventIds, []);

  let called = false;
  const disabled = await uploadStartupTelemetryBatch({
    events: [event('disabled')],
    endpoint: '',
    timeoutMs: 50,
    fetchImpl: async () => {
      called = true;
      throw new Error('must not run');
    }
  });
  assert.equal(disabled.attempted, false);
  assert.equal(called, false);

  console.log('startup telemetry uploader tests passed');
}

void run();
