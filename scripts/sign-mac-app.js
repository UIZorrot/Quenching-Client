#!/usr/bin/env node
/**
 * 使用 ad-hoc 签名对 macOS 应用程序进行签名
 * 封存修改后的应用；ad-hoc 不等于 Developer ID 签名和公证。
 * 注意：这需要 macOS 10.14.5 或更高版本
 */

import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export async function signMacApp(appPath) {
    if (process.platform !== 'darwin') throw new Error('codesign requires macOS');
    if (!fs.existsSync(appPath)) throw new Error(`Application not found: ${appPath}`);
    const { signAsync } = createRequire(import.meta.url)('@electron/osx-sign');
    await signAsync({
        app: path.resolve(appPath), platform: 'darwin', identity: '-', identityValidation: false,
        gatekeeperAssess: false, preAutoEntitlements: false, preEmbedProvisioningProfile: false,
        optionsForFile: () => ({ hardenedRuntime: false, timestamp: 'none' }),
    });
    execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath], { stdio: 'inherit' });
    console.log('Ad hoc signature verified. Developer ID notarization is still required for normal Gatekeeper trust.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    signMacApp(process.argv[2] || './__Bin/mac-arm64/QMClient.app').catch(error => {
        console.error(error.message); process.exitCode = 1;
    });
}
