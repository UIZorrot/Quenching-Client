import assert from 'node:assert/strict';

const savedPath = 'D:\\Saved Warcraft III';
const executable = `${savedPath}\\_retail_\\x86_64\\Warcraft III.exe`;

// The detector can initialize before preload is ready. A later scan must still
// restore the saved installation, even if optional auto-discovery fails.
(globalThis as any).window = {};
const { reaxel_War3Detector } = await import('../src/Renderer/hooks/useWar3Detector');
const detector = reaxel_War3Detector();

(globalThis as any).window.electronAPI = {
  getConfig: async (key: string) => key === 'war3Path' ? savedPath : 'retail',
  pathExists: async (value: string) => value.replace(/\//g, '\\') === executable,
  getCurrentDirectory: async () => { throw new Error('optional directory probe failed'); },
};

await detector.detectInstallations();
assert.equal(detector.store.currentInstallation?.path, savedPath);
assert.equal(detector.store.currentInstallation?.executablePath.replace(/\\/g, '/'), executable.replace(/\\/g, '/'));
assert.equal(detector.store.installations[0]?.path, savedPath);
assert.equal(detector.store.isDetecting, false);
console.log('Saved Warcraft III directory survives renderer startup and optional probe failures.');
