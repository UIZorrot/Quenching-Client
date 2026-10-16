// Build-time / support audit. Never runs during normal client startup.
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import asar from '@electron/asar';

export function unpackedFileRecords(archive) {
    const records = [];
    function walk(node, relative = '') {
        if (node.files) {
            for (const [name, child] of Object.entries(node.files)) walk(child, relative ? `${relative}/${name}` : name);
        } else if (node.unpacked === true && !node.link) {
            // A directory can contain both packed and unpacked files. Inspect
            // the leaf flag rather than inheriting its parent's unpacked flag.
            records.push({path: relative, size: node.size, integrity: node.integrity});
        }
    }
    walk(asar.getRawHeader(archive).header);
    return records;
}

export async function checkClientPackage(root, {loadNativeModules = true} = {}) {
    root = path.resolve(root);
    const archive = path.join(root, 'resources', 'app.asar');
    const records = unpackedFileRecords(archive);
    for (const file of records) {
        const disk = `${archive}.unpacked/${file.path}`;
        let bytes;
        try { bytes = await fs.readFile(disk); }
        catch (error) {
            if (error.code !== 'ENOENT') throw error;
            throw new Error(`Missing app.asar.unpacked file: ${file.path}`);
        }
        if (bytes.length !== file.size) throw new Error(`Wrong app.asar.unpacked size: ${file.path}`);
        if (file.integrity?.algorithm === 'SHA256' && crypto.createHash('sha256').update(bytes).digest('hex') !== file.integrity.hash) {
            throw new Error(`Wrong app.asar.unpacked SHA256: ${file.path}`);
        }
    }
    let modules = [];
    if (loadNativeModules) {
        if (process.platform !== 'win32') throw new Error('Windows portable runtime check requires Windows; use loadNativeModules:false for a file-only audit.');
        const code = `
            const {createRequire}=require('node:module'), path=require('node:path');
            const local=createRequire(path.join(process.argv[1],'dist','main.js'));
            const names=['@jamiephan/casclib','@jamiephan/stormlib'];
            for(const name of names){
                const native=local(name);
                const Constructor=name.endsWith('casclib')?native.Storage:native.Archive;
                if(typeof Constructor!=='function')throw new Error('Missing native API: '+name);
                new Constructor();
            }
            console.log(JSON.stringify(names));`;
        const {stdout} = await promisify(execFile)(path.join(root, 'QMClient.exe'), ['-e', code, archive], {
            env: {...process.env, ELECTRON_RUN_AS_NODE: '1'}, windowsHide: true, timeout: 20000, maxBuffer: 8000,
        });
        modules = JSON.parse(stdout.trim());
    }
    return {root, version: JSON.parse(asar.extractFile(archive, 'package.json')).version, unpackedFilesVerified: records.length, modules};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    if (!process.argv[2] || !fss.existsSync(process.argv[2])) throw new Error('Usage: node scripts/check-client-package.mjs <Windows portable directory> [--files-only]');
    console.log(JSON.stringify(await checkClientPackage(process.argv[2], {loadNativeModules: !process.argv.includes('--files-only')}), null, 2));
}
