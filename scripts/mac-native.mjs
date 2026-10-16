import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

export const MAC_NATIVE_PACKAGES = ['@jamiephan/stormlib', '@jamiephan/casclib'];

export function machOArchitectures(bytes) {
    if (bytes.length < 8) return [];
    const magic = bytes.readUInt32BE(0);
    const name = cpu => cpu === 0x100000c ? 'arm64' : cpu === 0x1000007 ? 'x64' : 'unsupported';
    if (magic === 0xcffaedfe) return [name(bytes.readUInt32LE(4))];
    if (magic === 0xfeedfacf) return [name(bytes.readUInt32BE(4))];
    if (magic === 0xcafebabe || magic === 0xcafebabf) {
        const count = bytes.readUInt32BE(4), stride = magic === 0xcafebabf ? 32 : 20;
        if (bytes.length < 8 + count * stride) return [];
        return Array.from({ length: count }, (_, index) => name(bytes.readUInt32BE(8 + index * stride)));
    }
    return [];
}

/** Use the same resolver as the binding, then reject foreign/wrong-arch binaries. */
export function validateMacNative(root, arch) {
    const resolver = `process.env.npm_config_platform='darwin';process.env.npm_config_arch=process.argv[2];
        process.stdout.write(require('node-gyp-build').path(process.argv[1]));`;
    return MAC_NATIVE_PACKAGES.map(name => {
        const directory = path.join(root, 'node_modules', name);
        const resolved = spawnSync(process.execPath, ['-e', resolver, directory, arch], {
            cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 128 * 1024,
        });
        if (resolved.status !== 0) throw new Error(`Missing macOS ${arch} native module: ${directory}\n${resolved.stderr || resolved.error || ''}`);
        const file = resolved.stdout.trim();
        if (!machOArchitectures(fs.readFileSync(file)).includes(arch)) throw new Error(`Not a macOS ${arch} native binary: ${file}`);
        return { name, file };
    });
}

export function smokeMacNative(executable, appRoot) {
    const code = `const req=require('node:module').createRequire(require('node:path').join(process.argv[1],'package.json'));
        const {Archive}=req('@jamiephan/stormlib');const {Storage}=req('@jamiephan/casclib');
        new Archive();new Storage();console.log('PASS: StormLib and CascLib loaded under Electron '+process.versions.electron+' / '+process.arch);`;
    const result = spawnSync(executable, ['-e', code, appRoot], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8', timeout: 30000,
        maxBuffer: 128 * 1024, windowsHide: true,
    });
    if (result.status !== 0) throw new Error(`Electron native-module smoke test failed: ${result.stderr || result.error || result.stdout}`);
    console.log(result.stdout.trim());
}

export function installedElectron(root) {
    const require = createRequire(path.join(root, 'package.json'));
    return { executable: require('electron'), version: require('electron/package.json').version };
}
