const MAX_BATCH_EVENTS = 40;
const MAX_BATCH_BYTES = 96 * 1024;

export type UploadableStartupEvent = {
  id: string;
  anonymousInstallId: string;
  [key: string]: unknown;
};

export type TelemetryUploadResult =
  | { attempted: false; acceptedEventIds: string[] }
  | { attempted: true; acceptedEventIds: string[] };

type FetchLike = (
  input: string,
  init: {
    method: 'POST';
    headers: { 'Content-Type': 'application/json' };
    body: string;
    signal: AbortSignal;
  }
) => Promise<{
  status: number;
  json(): Promise<unknown>;
}>;

/** Selects one protocol-compliant batch without mutating the local queue. */
export function createStartupTelemetryBatch(
  events: UploadableStartupEvent[]
): UploadableStartupEvent[] {
  const firstEvent = events.find(isUploadableEvent);
  if (!firstEvent) return [];

  const batch: UploadableStartupEvent[] = [];
  for (const event of events) {
    if (batch.length >= MAX_BATCH_EVENTS) break;
    if (!isUploadableEvent(event)) continue;
    if (event.anonymousInstallId !== firstEvent.anonymousInstallId) continue;

    const candidate = [...batch, event];
    if (bodyByteLength(candidate) > MAX_BATCH_BYTES) break;
    batch.push(event);
  }
  return batch;
}

export function removeAcceptedStartupEvents<T extends UploadableStartupEvent>(
  events: T[],
  acceptedEventIds: string[]
): T[] {
  if (acceptedEventIds.length === 0) return events;
  const acceptedIds = new Set(acceptedEventIds);
  return events.filter(event => !acceptedIds.has(event.id));
}

/**
 * Performs exactly one upload attempt. Failures are deliberately collapsed to
 * an empty accepted list so callers retain the queue and stay silent.
 */
export async function uploadStartupTelemetryBatch(options: {
  events: UploadableStartupEvent[];
  endpoint?: string;
  timeoutMs: number;
  fetchImpl?: FetchLike;
}): Promise<TelemetryUploadResult> {
  const endpoint = options.endpoint?.trim();
  const batch = createStartupTelemetryBatch(options.events);
  if (!endpoint || batch.length === 0) {
    return { attempted: false, acceptedEventIds: [] };
  }

  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  timeout.unref?.();

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      signal: controller.signal
    });
    if (response.status !== 200) {
      return { attempted: true, acceptedEventIds: [] };
    }

    const payload = await response.json();
    if (!isUploadResponse(payload)) {
      return { attempted: true, acceptedEventIds: [] };
    }

    const batchIds = new Set(batch.map(event => event.id));
    const acceptedEventIds = [
      ...new Set(payload.acceptedEventIds.filter(id => batchIds.has(id)))
    ];
    return { attempted: true, acceptedEventIds };
  } catch {
    return { attempted: true, acceptedEventIds: [] };
  } finally {
    clearTimeout(timeout);
  }
}

function isUploadableEvent(event: unknown): event is UploadableStartupEvent {
  if (!event || typeof event !== 'object') return false;
  const candidate = event as Partial<UploadableStartupEvent>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.anonymousInstallId === 'string' &&
    candidate.anonymousInstallId.length > 0
  );
}

function bodyByteLength(events: UploadableStartupEvent[]): number {
  return Buffer.byteLength(JSON.stringify({ events }), 'utf8');
}

function isUploadResponse(value: unknown): value is {
  acceptedEventIds: string[];
  insertedEventIds: string[];
  duplicateEventIds: string[];
} {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return (
    isStringArray(payload.acceptedEventIds) &&
    isStringArray(payload.insertedEventIds) &&
    isStringArray(payload.duplicateEventIds)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}
