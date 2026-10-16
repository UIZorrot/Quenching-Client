import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { updateTestBase } from './update-channel';

// A test portable contains this small flag beside its EXE. Production bundles
// do not. Keep it outside app.asar so normal updates and later direct launches
// retain the selected channel without a CMD launcher or inherited environment.
export function initializePortableUpdateTest(): void {
  if (process.env.QUENCHING_UPDATE_TEST === '0') return;
  const root = path.dirname(process.execPath);
  const marker = path.join(root, 'quenching-update-test.json');
  if (!fs.existsSync(marker)) return;
  const settings = JSON.parse(fs.readFileSync(marker, 'utf8'));
  if (settings.schema !== 1 || settings.enabled !== true) return;
  process.env.QUENCHING_UPDATE_TEST = '1';
  process.env.QUENCHING_UPDATE_TEST_BASE ||= settings.baseUrl;
  updateTestBase(); // Use the same HTTPS/test-loopback URL rules as the services.
  process.env.QUENCHING_TEST_CONFIG_DIR ||= path.join(root, '.test-config');
  fs.mkdirSync(process.env.QUENCHING_TEST_CONFIG_DIR, { recursive: true });
  if (!app.commandLine.hasSwitch('user-data-dir')) {
    const userData = path.join(root, '.test-user-data');
    fs.mkdirSync(userData, { recursive: true });
    app.setPath('userData', userData);
    app.setPath('sessionData', userData);
  }
}

initializePortableUpdateTest();
