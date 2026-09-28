import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  removeAcceptedStartupEvents,
  uploadStartupTelemetryBatch
} from './startup-telemetry-uploader';

const SCHEMA_VERSION = 1;
const MAX_EVENTS = 40;
const MAX_STATE_FILE_BYTES = 64 * 1024;
const MAX_MESSAGE_LENGTH = 240;
const MAX_STACK_FRAMES = 3;
const MAX_STACK_FRAME_LENGTH = 180;
const TELEMETRY_ENDPOINT = 'https://qm.txzy.net/v1/telemetry/events';
const UPLOAD_DELAY_MS = 1500;
const UPLOAD_TIMEOUT_MS = 1500;

type StartupEventName =
  | 'startup_attempt'
  | 'startup_success'
  | 'startup_failure'
  | 'app_crash';

type StartupEvent = {
  id: string;
  name: StartupEventName;
  timestamp: string;
  anonymousInstallId: string;
  sessionId: string;
  appVersion: string;
  platform: NodeJS.Platform;
  arch: string;
  osRelease: string;
  details?: Record<string, string | number | boolean>;
};

type CurrentSession = {
  id: string;
  startedAt: string;
  startupSucceededAt?: string;
  status: 'running' | 'crashed';
};

type TelemetryState = {
  schemaVersion: number;
  anonymousInstallId: string;
  currentSession: CurrentSession | null;
  events: StartupEvent[];
};

/**
 * A deliberately small startup/crash queue with a best-effort uploader.
 *
 * Every operation is best-effort: a telemetry failure must never prevent the
 * client from starting or exiting.
 */
class StartupTelemetry {
  private readonly statePath: string;
  private readonly sessionId = randomUUID();
  private state: TelemetryState;
  private startupFinished = false;
  private crashRecorded = false;
  private uploadScheduled = false;

  constructor() {
    this.statePath = path.join(app.getPath('userData'), 'telemetry', 'startup-events.json');
    this.state = this.readState();

    const previousSession = this.state.currentSession;
    if (previousSession?.status === 'running') {
      this.enqueue('app_crash', previousSession.id, {
        process: 'app',
        reason: 'unclean_exit',
        phase: previousSession.startupSucceededAt ? 'runtime' : 'startup',
        inferred: true
      });
    }

    const startedAt = new Date().toISOString();
    this.state.currentSession = {
      id: this.sessionId,
      startedAt,
      status: 'running'
    };
    this.enqueue('startup_attempt', this.sessionId);

    // This one small synchronous write is intentional: it lets the next run
    // detect a native crash or forced termination that occurs during startup.
    this.persist();
  }

  markStartupSuccess(): void {
    if (this.startupFinished || this.crashRecorded) return;

    this.startupFinished = true;
    const succeededAt = new Date().toISOString();
    if (this.state.currentSession?.id === this.sessionId) {
      this.state.currentSession.startupSucceededAt = succeededAt;
    }
    this.enqueue('startup_success', this.sessionId);
    this.persist();
    this.scheduleUpload();
  }

  recordStartupFailure(error: unknown): void {
    if (this.startupFinished || this.crashRecorded) return;

    this.startupFinished = true;
    this.enqueue('startup_failure', this.sessionId, {
      ...summarizeError(error),
      phase: 'window_load'
    });
    this.persist();
  }

  recordCrash(
    processType: 'main' | 'renderer',
    reason: string,
    error?: unknown,
    exitCode?: number
  ): void {
    if (this.crashRecorded) return;
    this.crashRecorded = true;

    if (this.state.currentSession?.id === this.sessionId) {
      this.state.currentSession.status = 'crashed';
    }

    this.enqueue('app_crash', this.sessionId, {
      process: processType,
      reason: cleanText(reason, 80),
      phase: this.startupFinished ? 'runtime' : 'startup',
      ...(typeof exitCode === 'number' ? { exitCode } : {}),
      ...summarizeError(error)
    });
    this.persist();
  }

  markNormalExit(): void {
    if (this.state.currentSession?.id !== this.sessionId) return;
    if (!this.startupFinished && !this.crashRecorded) {
      this.startupFinished = true;
      this.enqueue('startup_failure', this.sessionId, {
        phase: 'startup',
        reason: 'quit_before_ready'
      });
    }
    this.state.currentSession = null;
    this.persist();
  }

  private scheduleUpload(): void {
    if (this.uploadScheduled || !TELEMETRY_ENDPOINT) return;
    this.uploadScheduled = true;

    const timer = setTimeout(() => {
      void this.uploadOnce();
    }, UPLOAD_DELAY_MS);
    timer.unref?.();
  }

  private async uploadOnce(): Promise<void> {
    const result = await uploadStartupTelemetryBatch({
      events: this.state.events,
      endpoint: TELEMETRY_ENDPOINT,
      timeoutMs: UPLOAD_TIMEOUT_MS
    });
    if (result.acceptedEventIds.length === 0) return;

    // Only IDs from the submitted batch can be returned by the helper. Events
    // appended while the request was in flight therefore remain queued.
    this.state.events = removeAcceptedStartupEvents(
      this.state.events,
      result.acceptedEventIds
    );
    this.persist();
  }

  private enqueue(
    name: StartupEventName,
    sessionId: string,
    details?: Record<string, string | number | boolean>
  ): void {
    this.state.events.push({
      id: randomUUID(),
      name,
      timestamp: new Date().toISOString(),
      anonymousInstallId: this.state.anonymousInstallId,
      sessionId,
      appVersion: safeAppVersion(),
      platform: process.platform,
      arch: process.arch,
      osRelease: cleanText(os.release(), 80),
      ...(details && Object.keys(details).length > 0 ? { details } : {})
    });
    this.state.events = this.state.events.slice(-MAX_EVENTS);
  }

  private readState(): TelemetryState {
    const emptyState = (): TelemetryState => ({
      schemaVersion: SCHEMA_VERSION,
      anonymousInstallId: randomUUID(),
      currentSession: null,
      events: []
    });

    try {
      if (!existsSync(this.statePath)) return emptyState();
      if (statSync(this.statePath).size > MAX_STATE_FILE_BYTES) return emptyState();

      const parsed = JSON.parse(readFileSync(this.statePath, 'utf8')) as Partial<TelemetryState>;
      if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.events)) {
        return emptyState();
      }

      return {
        schemaVersion: SCHEMA_VERSION,
        anonymousInstallId:
          typeof parsed.anonymousInstallId === 'string'
            ? cleanText(parsed.anonymousInstallId, 80)
            : randomUUID(),
        currentSession: isCurrentSession(parsed.currentSession) ? parsed.currentSession : null,
        events: parsed.events.slice(-MAX_EVENTS)
      };
    } catch {
      return emptyState();
    }
  }

  private persist(): void {
    try {
      mkdirSync(path.dirname(this.statePath), { recursive: true });
      writeFileSync(this.statePath, JSON.stringify(this.state), {
        encoding: 'utf8',
        flag: 'w'
      });
    } catch {
      // Telemetry must remain invisible to users and must never affect usage.
    }
  }
}

function isCurrentSession(value: unknown): value is CurrentSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CurrentSession>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.startedAt === 'string' &&
    (candidate.status === 'running' || candidate.status === 'crashed')
  );
}

function safeAppVersion(): string {
  try {
    return cleanText(app.getVersion(), 40);
  } catch {
    return 'unknown';
  }
}

function cleanText(value: unknown, maxLength: number): string {
  const text = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[A-Za-z]:[\\/][^\s)\]}]+/g, '<path>')
    .replace(/\/(?:Users|home)\/[^\s)\]}]+/gi, '<path>')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, maxLength);
}

function summarizeError(error: unknown): Record<string, string> {
  if (error === undefined || error === null) return {};

  if (error instanceof Error) {
    const stackFrames = String(error.stack ?? '')
      .split(/\r?\n/)
      .slice(1, MAX_STACK_FRAMES + 1)
      .map(frame => cleanText(frame, MAX_STACK_FRAME_LENGTH))
      .filter(Boolean)
      .join(' | ');

    return {
      errorName: cleanText(error.name || 'Error', 80),
      errorMessage: cleanText(error.message, MAX_MESSAGE_LENGTH),
      ...(stackFrames ? { stackFrames } : {})
    };
  }

  return { errorMessage: cleanText(error, MAX_MESSAGE_LENGTH) };
}

export const startupTelemetry = new StartupTelemetry();

const rendererCrashReasons = new Set([
  'abnormal-exit',
  'crashed',
  'oom',
  'launch-failed',
  'integrity-failure'
]);

app.on('web-contents-created', (_event, contents) => {
  contents.on('render-process-gone', (_goneEvent, details) => {
    if (!rendererCrashReasons.has(details.reason)) return;
    startupTelemetry.recordCrash('renderer', details.reason, undefined, details.exitCode);
  });
});

app.once('before-quit', () => {
  startupTelemetry.markNormalExit();
});

process.on('uncaughtExceptionMonitor', (error, origin) => {
  startupTelemetry.recordCrash('main', origin, error);
});
