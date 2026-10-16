/** Build both native bindings on a Mac, against the actual installed Electron. */
import fs from 'fs-extra';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { MAC_NATIVE_PACKAGES, installedElectron, validateMacNative, smokeMacNative } from './mac-native.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const arch = process.argv.includes('--x64') ? 'x64' : process.argv.includes('--arm64') ? 'arm64' : process.arch;

async function main() {
    if (process.platform !== 'darwin') throw new Error('Mac native modules and signing require macOS. Use the manual macOS workflow in .github/workflows/build-mac.yml.');
    if (arch !== process.arch) throw new Error(`Use a ${arch} Mac runner for ${arch} packaging; current runner is ${process.arch}.`);
    // Revisions used by the binding author's thirdparty submodules. Avoid moving master.
    for (const [name, revision] of [
        ['StormLib', '44ebfbfc109d76e2a85bbd5d8b0c949df7e65c6f'],
        ['CascLib', '2a280f5a231966dc5d1b534978dd9f9f04a374cd'],
    ]) {
        const destination = path.join(root, 'node_modules', 'thirdparty', name);
        const marker = path.join(destination, '.quenching-source-revision');
        if ((await fs.readFile(marker, 'utf8').catch(() => '')).trim() === revision) continue;
        const response = await fetch(`https://codeload.github.com/ladislav-zezula/${name}/zip/${revision}`);
        if (!response.ok) throw new Error(`${name} source download failed: HTTP ${response.status}`);
        const zip = await require('jszip').loadAsync(Buffer.from(await response.arrayBuffer()));
        // Build inputs under node_modules, never player resources.
        await fs.emptyDir(destination);
        for (const entry of Object.values(zip.files)) {
            if (entry.dir) continue;
            const relative = entry.name.split('/').slice(1).join('/');
            if (!relative || relative.split('/').includes('..')) continue;
            await fs.outputFile(path.join(destination, relative), await entry.async('nodebuffer'));
        }
        await fs.outputFile(marker, revision);
        console.log(`Prepared ${name} ${revision}`);
    }
    const { version, executable } = installedElectron(root);
    await require('@electron/rebuild').rebuild({
        buildPath: root, electronVersion: version, arch, force: true,
        // electron-rebuild 3.x filters scoped packages by the unscoped folder name.
        onlyModules: MAC_NATIVE_PACKAGES.map(name => name.split('/').pop()), mode: 'sequential',
    });
    validateMacNative(root, arch);
    smokeMacNative(executable, root);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
