#!/usr/bin/env node
/**
 * 使用 ad-hoc 签名对 macOS 应用程序进行签名
 * 这样可以避免"应用程序已损坏"的警告
 * 注意：这需要 macOS 10.14.5 或更高版本
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const appPath = process.argv[2] || './__Bin/mac-arm64/QM Client.app';

if (!fs.existsSync(appPath)) {
    console.error('Application not found at:', appPath);
    process.exit(1);
}

console.log('Signing application with ad-hoc signature...');

try {
    // 使用 ad-hoc 签名（- 表示自签名）
    // --force 表示强制重新签名
    // --deep 表示递归签名所有组件
    const signCommand = `codesign --force --deep --sign - "${appPath}"`;

    console.log('Running:', signCommand);
    execSync(signCommand, {
        stdio: 'inherit'
    });

    console.log('\n✅ Application signed successfully!');

    // 验证签名
    console.log('\nVerifying signature...');
    execSync(`codesign --verify --verbose "${appPath}"`, {
        stdio: 'inherit'
    });

    console.log('\n✅ Signature verified!');

    // 显示签名信息
    console.log('\nSignature details:');
    execSync(`codesign --display --verbose "${appPath}"`, {
        stdio: 'inherit'
    });

} catch (error) {
    console.error('\n❌ Failed to sign application:', error.message);

    // 提供解决方案
    console.log('\n\n💡 Possible solutions:');
    console.log('1. Make sure you are running on macOS');
    console.log('2. Try running: xcode-select --install');
    console.log('3. Check if Xcode command line tools are installed');

    process.exit(1);
}
