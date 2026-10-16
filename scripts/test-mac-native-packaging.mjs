import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { MAC_NATIVE_PACKAGES, machOArchitectures, validateMacNative } from './mac-native.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-mac-native-'));
const thin = arch => {
    const data = Buffer.alloc(32);
    data.writeUInt32LE(0xfeedfacf, 0);
    data.writeUInt32LE(arch === 'arm64' ? 0x100000c : 0x1000007, 4);
    return data;
};
try {
    await fs.copy('node_modules/node-gyp-build', path.join(root, 'node_modules/node-gyp-build'));
    for (const name of MAC_NATIVE_PACKAGES) {
        const dir = path.join(root, 'node_modules', name);
        await fs.outputJson(path.join(dir, 'package.json'), { name });
        await fs.outputFile(path.join(dir, 'prebuilds/win32-x64/node.napi.node'), 'MZ');
    }
    assert.throws(() => validateMacNative(root, 'arm64'), /Missing macOS arm64.*stormlib/s);
    for (const name of MAC_NATIVE_PACKAGES) {
        await fs.outputFile(path.join(root, 'node_modules', name, 'prebuilds/darwin-arm64/node.napi.node'), thin('x64'));
    }
    assert.throws(() => validateMacNative(root, 'arm64'), /Not a macOS arm64 native binary/);
    for (const name of MAC_NATIVE_PACKAGES) {
        await fs.outputFile(path.join(root, 'node_modules', name, 'prebuilds/darwin-arm64/node.napi.node'), thin('arm64'));
        await fs.outputFile(path.join(root, 'node_modules', name, 'prebuilds/darwin-x64/node.napi.node'), thin('x64'));
    }
    assert.equal(validateMacNative(root, 'arm64').length, 2);
    assert.equal(validateMacNative(root, 'x64').length, 2);
    // A foreign build/Release takes precedence over good prebuilds in the real
    // loader; validating only the presence of darwin/prebuilds would miss it.
    await fs.outputFile(path.join(root, 'node_modules/@jamiephan/stormlib/build/Release/stormlib.node'), 'MZ');
    assert.throws(() => validateMacNative(root, 'arm64'), /Not a macOS arm64 native binary.*build/s);
    const universal = Buffer.alloc(48);
    universal.writeUInt32BE(0xcafebabe, 0); universal.writeUInt32BE(2, 4);
    universal.writeUInt32BE(0x100000c, 8); universal.writeUInt32BE(0x1000007, 28);
    assert.deepEqual(machOArchitectures(universal), ['arm64', 'x64']);
    assert.deepEqual(machOArchitectures(Buffer.from('MZ-not-mac')), []);
    assert.deepEqual(machOArchitectures(Buffer.from('\x7fELF-not-mac')), []);
    if (process.platform !== 'darwin') {
        const result = spawnSync(process.execPath, ['scripts/package-mac-app.mjs'], { encoding: 'utf8', maxBuffer: 128 * 1024 });
        assert.notEqual(result.status, 0, 'Windows must not label an unsigned foreign-native app as a Mac candidate');
        assert.match(result.stderr, /macOS runner/);
    }
    console.log('PASS: missing darwin modules, wrong architecture, Windows/Linux binaries, loader precedence, both Mac architectures and unsupported-host packaging');
} finally {
    assert(path.basename(root).startsWith('quenching-mac-native-'));
    await fs.remove(root);
}
