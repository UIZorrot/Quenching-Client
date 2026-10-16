/** Keep technical URLs and IPC details out of the update notification. */
export function reportUpdateFailure(
  error: unknown,
  translate: (key: string, fallback?: string) => string,
): string {
  console.error('[Quenching update failed]', error);
  return translate('msg.update.retry_or_manual', '更新失败，请稍后重试或手动下载更新。');
}
