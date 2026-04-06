#!/usr/bin/env node
/**
 * 修复 macOS 应用程序的库路径问题
 * 解决 libffmpeg.dylib 无法加载的问题
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const appPath = process.argv[2] || './__Bin/mac-arm64/QM Client.app';

const electronFrameworkPath = path.join(
    appPath,
    'Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework'
);

if (!fs.existsSync(electronFrameworkPath)) {
    console.error('Electron Framework not found at:', electronFrameworkPath);
    process.exit(1);
}

console.log('Fixing rpath for Electron Framework...');

try {
    // 删除所有旧的 rpath
    try {
        const rpaths = execSync(`otool -l "${electronFrameworkPath}" | grep -A 1 LC_RPATH`, {
            encoding: 'utf8'
        });
        const rpathLines = rpaths.split('\n').filter(line => line.trim().startsWith('path'));
        for (const rpathLine of rpathLines) {
            const rpath = rpathLine.trim().replace('path ', '').trim();
            console.log('Removing rpath:', rpath);
            try {
                execSync(`install_name_tool -delete_rpath "${rpath}" "${electronFrameworkPath}"`, {
                    stdio: 'inherit'
                });
            } catch (e) {
                // 忽略错误
            }
        }
    } catch (e) {
        // 忽略错误
    }

    // 添加新的 rpath - 使用 @executable_path
    const newRpath = '@executable_path/../Frameworks/Electron Framework.framework/Versions/A/Libraries';
    console.log('Adding rpath:', newRpath);
    try {
        execSync(`install_name_tool -add_rpath "${newRpath}" "${electronFrameworkPath}"`, {
            stdio: 'inherit'
        });
    } catch (e) {
        console.log('Rpath already exists or failed to add:', e.message);
    }

    // 同时也添加 @loader_path 作为备用
    const loaderPath = '@loader_path/Libraries';
    console.log('Adding rpath:', loaderPath);
    try {
        execSync(`install_name_tool -add_rpath "${loaderPath}" "${electronFrameworkPath}"`, {
            stdio: 'inherit'
        });
    } catch (e) {
        console.log('Rpath already exists or failed to add:', e.message);
    }

    console.log('Rpath fixed successfully!');

    // 修复 libffmpeg.dylib 的 install name
    const ffmpegPath = path.join(
        appPath,
        'Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libffmpeg.dylib'
    );
    if (fs.existsSync(ffmpegPath)) {
        console.log('Fixing libffmpeg.dylib install name...');
        try {
            execSync(`install_name_tool -id "@rpath/libffmpeg.dylib" "${ffmpegPath}"`, {
                stdio: 'inherit'
            });
            console.log('libffmpeg.dylib install name fixed!');
        } catch (e) {
            console.log('Failed to fix libffmpeg.dylib install name:', e.message);
        }
    }

    // 验证修复
    const output = execSync(`otool -l "${electronFrameworkPath}" | grep -A 2 LC_RPATH`, {
        encoding: 'utf8'
    });
    console.log('Current rpaths:\n', output);

} catch (error) {
    console.error('Failed to fix rpath:', error.message);
    process.exit(1);
}
