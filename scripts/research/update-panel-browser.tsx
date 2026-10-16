import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import { GlobalLoadingProvider } from '../../src/Renderer/components/GlobalLoadingProvider';

// All IPC is simulated. Use the real home page, state hooks and loading overlay;
// this fixture never accesses the player's installation or publishes anything.
const params = new URLSearchParams(location.search);
const installLayout = params.get('installLayout') === '1';
const clientScenario = params.get('clientUpdate') === '1';
let installed = params.get('installed') !== '0';
if (installLayout) localStorage.setItem('quenching-language', params.get('lang') || 'zh-CN');
const fixturePath = installLayout ? 'D:\\淬火测试\\游戏目录\\Warcraft III' : 'fixture/Warcraft III';
const config: Record<string, any> = { war3Path: params.get('noPath') === '1' ? '' : fixturePath, gameChannel: params.get('channel') || 'retail' };
let updated = installLayout || clientScenario;
let clientProgressListener: ((progress: any) => void) | undefined;
let progressListener: ((progress: any) => void) | undefined;
const current = () => ({ product: 'quenching-mod', sequence: updated ? 35 : 34, version: updated ? '3.5' : '3.4', displayVersion: updated ? '3.5' : '3.4', files: [] });
const status = () => ({ decision: updated ? 'upToDate' : 'patch', current: current(), target: { sequence: 35, version: '3.5', displayVersion: '3.5' }, reason: '' });
const calls: string[] = [];
(window as any).updateTest = { calls, errors: [] };
window.addEventListener('error', e => (window as any).updateTest.errors.push(e.message));
window.addEventListener('unhandledrejection', e => (window as any).updateTest.errors.push(String(e.reason)));
const originalConsoleError = console.error;
console.error = (...args) => { (window as any).updateTest.errors.push(args.map(String).join(' ')); originalConsoleError(...args); };
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
window.electronAPI = new Proxy({
  getConfig: async (key: string) => config[key], setConfig: async (key: string, value: any) => { config[key] = value; },
  getCurrentDirectory: async () => '', getAppPath: async () => 'fixture/Documents',
  pathExists: async (name: string) => name.startsWith(config.war3Path) && (name.endsWith('_retail_') || name.endsWith('_ptr_') || name.endsWith('Warcraft III.exe')),
  readFile: async () => '', getFullPackageStatus: async () => installed,
  getBranchModStates: async () => ({ retail: { available: true, installed, enabled: true }, ptr: { available: installLayout, installed: installLayout && installed, enabled: false } }),
  getInstalledModState: async () => current(), getModUpdateStatus: async () => status(),
  getClientUpdateStatus: async () => clientScenario
    ? ({ decision: 'available', currentVersion: '3.6.0', targetVersion: '3.6.1', reason: '' })
    : ({ decision: 'upToDate', currentVersion: '3.5.0', reason: '' }),
  getInstallSpaceStatus: async () => ({ freeBytes: 30 * 1024 ** 3, requiredBytes: 10 * 1024 ** 3, insufficient: false, estimate: true }),
  detectWar3Version: async () => ({ source: 'fixture', version: '3.0.0.24268' }),
  onModUpdateProgress: (listener: any) => { progressListener = listener; return () => { progressListener = undefined; }; },
  onClientUpdateProgress: (listener: any) => { clientProgressListener = listener; return () => { clientProgressListener = undefined; }; },
  applyClientUpdate: async () => {
    calls.push('client-update');
    for (const received of [0, 20, 40, 60, 80, 100]) {
      clientProgressListener?.({ message: 'Downloading resources/app.asar', completed: 1 + received / 100, total: 4,
        completedBytes: received * 1024 * 1024, totalBytes: 100 * 1024 * 1024 });
      await pause(600);
    }
    if (params.get('clientFailure') === '1') throw new Error('isolated download failure');
    return { restarting: true };
  },
  applyModUpdate: async () => {
    calls.push('update');
    for (const [phase, percent] of [['downloading', 30], ['verifying', 70], ['applying', 98], ['finalizing', 99], ['complete', 100]] as const) {
      progressListener?.({ phase, percent, message: `${phase} fixture`, completedBytes: percent * 1024, totalBytes: 100 * 1024 });
      await pause(200);
    }
    updated = true;
    return { applied: true, status: status() };
  },
  selectFiles: async () => (window as any).updateTest.cancelSelection ? [] : ['fixture/QMF3.5-Full-A.zip', 'fixture/QMF3.5-Full-B.zip'],
  selectDirectory: async () => 'fixture/QMF3.5',
  selectGamePath: async () => { calls.push('choose-directory'); config.war3Path = fixturePath; return fixturePath; },
  installFullPackage: async (sources: string[]) => {
    calls.push('install:' + sources.join(','));
    for (const percent of [0, 70, 98, 99, 100]) {
      window.dispatchEvent(new CustomEvent('mod-install-progress', { detail: { percent, message: `Installing ${percent}%` } }));
      await pause(200);
    }
    updated = true;
    installed = true;
    return { success: true };
  },
  openExternal: async (url: string) => { calls.push('link:' + url); },
} as any, { get(target, key) { return key in target ? target[key] : async () => undefined; } });
const { MainWindow } = await import('../../src/Renderer/components/MainWindow');
createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
    <GlobalLoadingProvider><MainWindow /></GlobalLoadingProvider>
  </ConfigProvider></React.StrictMode>,
);
