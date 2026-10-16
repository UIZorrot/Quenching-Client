/** Independent update-test channel. Never mutate app versions, MOD markers or settings. */
export function updateTestEnabled(): boolean {
  return process.env.QUENCHING_UPDATE_TEST === '1';
}

export function updateTestBase(): string | undefined {
  if (!updateTestEnabled()) return undefined;
  const base = process.env.QUENCHING_UPDATE_TEST_BASE?.trim() || 'https://qm.txzy.net/quenching/update-test/';
  const parsed = new URL(base);
  const loopback = parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1';
  if ((parsed.protocol !== 'https:' && !loopback) || parsed.username || parsed.password || parsed.search || parsed.hash || !base.endsWith('/')) {
    throw new Error('Invalid isolated update-test base URL');
  }
  return base;
}

export function updateTestUrls(relative: string): string[] | undefined {
  const base = updateTestBase();
  return base ? [new URL(relative, base).toString()] : undefined;
}
