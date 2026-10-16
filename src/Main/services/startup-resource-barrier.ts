import type { IpcMain } from 'electron';

/** Foreground operations retain their existing concurrency; only startup takes an exclusive turn. */
export class StartupResourceBarrier {
  private active = 0;
  private idle: Array<() => void> = [];
  private startup: Promise<void> | null = null;

  async foreground<T>(action: () => T | Promise<T>): Promise<T> {
    while (this.startup) await this.startup;
    this.active++;
    try { return await action(); }
    finally {
      if (--this.active === 0) this.idle.splice(0).forEach(resolve => resolve());
    }
  }

  async exclusive<T>(action: () => T | Promise<T>): Promise<T> {
    while (this.startup) await this.startup;
    let release!: () => void;
    this.startup = new Promise<void>(resolve => { release = resolve; });
    try {
      if (this.active) await new Promise<void>(resolve => this.idle.push(resolve));
      return await action();
    } finally {
      this.startup = null;
      release();
    }
  }
}

export const startupResourceBarrier = new StartupResourceBarrier();

export function isStartupResourceOperation(channel: string): boolean {
  if (channel === 'config:set') return true;
  if (/^file:(write|copy|move|delete|extract|create)/.test(channel)) return true;
  if (/^(game:(launch|switch-channel|select-path)|campaign:(launch|extract|unlock)|client-update:apply|mod-update:apply)/.test(channel)) return true;
  return /^(mod|shader|mdl|terrain|tree|water|foliage|blight|glow|skin|ui|theme|third-party|vision|classic-skin|anti-harmony):/.test(channel)
    && !/:(get|read|list|detect|inspect|preview|status|is-|has-)/.test(channel);
}

/** Wrap the existing handlers as they register; restore ipcMain.handle even if registration throws. */
export function guardStartupResourceHandlers(ipc: IpcMain, register: () => void): void {
  const original = ipc.handle;
  ipc.handle = (channel, listener) => original.call(ipc, channel,
    isStartupResourceOperation(channel)
      ? (event, ...args) => startupResourceBarrier.foreground(() => listener(event, ...args))
      : listener);
  try { register(); } finally { ipc.handle = original; }
}
