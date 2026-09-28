const CLIENT_VERSION_PATTERN = /^v?\d+(?:\.\d+){1,2}$/i;

export function isValidClientVersion(value: string): boolean {
  return CLIENT_VERSION_PATTERN.test(value.trim());
}

export function isNewerClientVersion(remote: string, local: string): boolean {
  if (!isValidClientVersion(remote) || !isValidClientVersion(local)) return false;
  const numbers = (version: string) => version.trim().replace(/^v/i, '').split('.').map(Number);
  const remoteParts = numbers(remote);
  const localParts = numbers(local);
  for (let index = 0; index < 3; index += 1) {
    const difference = (remoteParts[index] || 0) - (localParts[index] || 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}
