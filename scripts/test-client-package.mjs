import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createPackageWithOptions} from '@electron/asar';
import {checkClientPackage, unpackedFileRecords} from './check-client-package.mjs';

const parent = path.resolve('_irys/work');
await fs.mkdir(parent, {recursive: true});
const work = await fs.mkdtemp(path.join(parent, 'package-sidecar-test-'));
try {
    const source = path.join(work, 'source');
    const root = path.join(work, '客户端 (1)', 'QMC-Win');
    const moduleDir = path.join(source, 'node_modules', 'fixture-module');
    await fs.mkdir(moduleDir, {recursive: true});
    await fs.mkdir(path.join(root, 'resources'), {recursive: true});
    await fs.writeFile(path.join(source, 'package.json'), JSON.stringify({name: 'sidecar-fixture', version: '0.0.0'}));
    const metadata = Buffer.from(JSON.stringify({name: 'fixture-module', exports: './index.js'}));
    await fs.writeFile(path.join(moduleDir, 'package.json'), metadata);
    await fs.writeFile(path.join(moduleDir, 'index.js'), 'module.exports={value:42};');
    const archive = path.join(root, 'resources', 'app.asar');
    await createPackageWithOptions(source, archive, {unpack: '**/fixture-module/package.json'});
    assert.deepEqual(unpackedFileRecords(archive).map(file => file.path), ['node_modules/fixture-module/package.json']);
    assert.equal((await checkClientPackage(root, {loadNativeModules: false})).unpackedFilesVerified, 1);

    const run = () => promisify(execFile)(path.resolve('node_modules/electron/dist/electron.exe'), ['-e',
        'const r=require("node:module").createRequire(process.argv[1]+"/dist/main.js"); console.log(r("fixture-module").value);', archive],
        {env: {...process.env, ELECTRON_RUN_AS_NODE: '1'}, windowsHide: true, timeout: 15000, maxBuffer: 5000});
    if (process.platform === 'win32') assert.equal((await run()).stdout.trim(), '42');

    const sidecar = `${archive}.unpacked/node_modules/fixture-module/package.json`;
    await fs.unlink(sidecar);
    await assert.rejects(checkClientPackage(root, {loadNativeModules: false}), /Missing app.asar.unpacked file: node_modules\/fixture-module\/package.json/);
    if (process.platform === 'win32') {
        await assert.rejects(run(), error => /ENOENT/.test(error.stderr) && /app\.asar\.unpacked/.test(error.stderr) && /package\.json/.test(error.stderr));
    }
    await fs.writeFile(sidecar, Buffer.alloc(metadata.length, 32));
    await assert.rejects(checkClientPackage(root, {loadNativeModules: false}), /Wrong app.asar.unpacked SHA256/);
    await fs.writeFile(sidecar, metadata);
    assert.equal((await checkClientPackage(root, {loadNativeModules: false})).unpackedFilesVerified, 1);
    if (process.platform === 'win32') assert.equal((await run()).stdout.trim(), '42');
    console.log('Package audit passed: missing and corrupt unpacked metadata rejected; actual Electron ENOENT reproduced and restored; packed sibling remains valid.');
} finally {
    if (path.dirname(work) !== parent || !path.basename(work).startsWith('package-sidecar-test-')) throw new Error('unsafe fixture cleanup');
    await fs.rm(work, {recursive: true, force: true});
}
