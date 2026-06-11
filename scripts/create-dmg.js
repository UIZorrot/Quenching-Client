#!/usr/bin/env node
/**
 * 手动创建 DMG 文件
 * 解决 electron-builder 的 hdiutil 问题
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const appPath = './__Bin/mac-arm64/QMClient.app';
const dmgPath = './__Bin/QMClient.dmg';

if (!fs.existsSync(appPath)) {
    console.error('Application not found at:', appPath);
    process.exit(1);
}

console.log('Creating DMG...');

try {
    // 使用 UDZO 格式创建 DMG（兼容性更好）
    execSync(
        `hdiutil create -srcfolder "${appPath}" -volname "QM Client" -format UDZO -o "${dmgPath}"`,
        {
            stdio: 'inherit'
        }
    );

    console.log('DMG created successfully at:', dmgPath);

    // 检查文件大小
    const stats = fs.statSync(dmgPath);
    console.log(`DMG size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

} catch (error) {
    console.error('Failed to create DMG:', error.message);
    process.exit(1);
}
