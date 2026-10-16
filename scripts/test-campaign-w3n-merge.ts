import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { Archive, MPQ_CREATE_LISTFILE, MPQ_CREATE_ATTRIBUTES } from '@jamiephan/stormlib';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qm-campaign-merge-'));
const assets = path.resolve('assets');
(globalThis as any).__campaignStormLib = await import('@jamiephan/stormlib');
const bundle = await build({
    stdin: { contents: "export { extractCampaignW3nMerged } from './src/Main/services/campaign-w3n-merge';", resolveDir: process.cwd(), loader: 'ts' },
    platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
    plugins: [{ name: 'campaign-assets', setup(plugin) {
        plugin.onResolve({ filter: /\/asset-sync$/ }, () => ({ path: 'asset-sync', namespace: 'fixture' }));
        plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const AssetSyncService={getAssetsDir:async()=>${JSON.stringify(assets)}};` }));
        // Some authoring tools list metadata explicitly. Keep all MPQ operations
        // native; emulate only these extra source index lines from the report.
        plugin.onResolve({ filter: /^@jamiephan\/stormlib$/ }, () => ({ path: 'stormlib', namespace: 'storm-listing' }));
        plugin.onLoad({ filter: /.*/, namespace: 'storm-listing' }, () => ({ contents: `
            const native=globalThis.__campaignStormLib;
            export const MPQ_FILE_REPLACEEXISTING=native.MPQ_FILE_REPLACEEXISTING;
            export class Archive extends native.Archive {
                readFileAsString(name) {
                    const value=super.readFileAsString(name);
                    return name==='(listfile)' ? value+'\\r\\n(listfile)\\r\\n(ATTRIBUTES)\\r\\n' : value;
                }
                addFile(source,name,options) {
                    return super.addFile(globalThis.__campaignFailWrite && name==='war3map.j' ? source+'.missing' : source,name,options);
                }
            }` }));
    } }],
});
const module = { exports: {} as any };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { extractCampaignW3nMerged } = module.exports;

function createArchive(target: string, entries: Record<string, Buffer | string>): void {
    const archive = new Archive();
    archive.create(target, { maxFileCount: 64, flags: MPQ_CREATE_LISTFILE | MPQ_CREATE_ATTRIBUTES });
    try {
        let index = 0;
        for (const [internal, data] of Object.entries(entries)) {
            const source = path.join(root, `file-${path.basename(target)}-${index++}.bin`);
            fs.writeFileSync(source, data);
            assert.ok(archive.addFile(source, internal));
        }
    } finally { archive.close(); }
}

try {
    const first = path.join(root, 'first.w3x');
    const second = path.join(root, 'second.w3m');
    createArchive(first, {
        'war3map.j': 'function main takes nothing returns nothing\nendfunction',
        'war3map.w3e': Buffer.from('map terrain bytes'),
        'textures\\map-only.blp': Buffer.from('map-specific texture'),
        'units\\shared.txt': 'map value replaced by campaign value',
        'textures\\(listfile).blp': 'ordinary resource containing the reserved word',
    });
    createArchive(second, { 'war3map.j': 'second map script', 'textures\\second.blp': 'second-map texture' });

    // Real StormLib rejects reserved metadata even with replacement flags.
    const probe = new Archive();
    probe.open(first);
    try {
        assert.ok(probe.hasFile('(listfile)'));
        assert.throws(() => probe.addFile(second, '(listfile)'), /Failed to add file/);
    } finally { probe.close(); }

    const campaign = path.join(root, 'source.w3n');
    createArchive(campaign, {
        'maps\\first.w3x': fs.readFileSync(first),
        'maps\\second.w3m': fs.readFileSync(second),
        'war3campaign.w3f': 'campaign metadata',
        'units\\shared.txt': 'campaign shared value',
        'textures\\campaign-only.blp': 'campaign texture',
        'war3campImported\\loose.blp': 'loose campaign import',
    });
    const campaignBytes = fs.readFileSync(campaign);
    const destination = path.join(root, 'out');
    const progress: any[] = [];
    const result = await extractCampaignW3nMerged(campaign, destination, (event: any) => progress.push(event));
    assert.equal(result.maps.length, 2);
    for (const mergedPath of result.maps) {
        const merged = new Archive();
        merged.open(mergedPath);
        try {
            assert.equal(merged.readFileAsString('units\\shared.txt'), 'campaign shared value');
            assert.equal(merged.readFileAsString('textures\\campaign-only.blp'), 'campaign texture');
            assert.ok(merged.hasFile('war3map.j'));
            assert.ok(merged.hasFile('(listfile)'));
            const list = merged.readFileAsString('(listfile)');
            assert.ok(list.includes('textures\\campaign-only.blp'), 'StormLib must regenerate metadata with merged resources');
            assert.ok(!merged.hasFile('maps\\first.w3x'));
            assert.ok(!merged.hasFile('maps\\second.w3m'));
        } finally { merged.close(); }
    }
    const map = new Archive();
    map.open(result.maps.find((entry: string) => entry.endsWith('first_merged.w3x')));
    try {
        assert.equal(map.readFileAsString('textures\\map-only.blp'), 'map-specific texture');
        assert.equal(map.readFileAsString('textures\\(listfile).blp'), 'ordinary resource containing the reserved word');
        const file = map.openFile('war3map.w3e');
        try { assert.deepEqual(file.readAll(), Buffer.from('map terrain bytes')); } finally { file.close(); }
    } finally { map.close(); }
    assert.equal(fs.readFileSync(path.join(destination, 'war3campImported', 'loose.blp'), 'utf8'), 'loose campaign import');
    assert.equal(await fs.pathExists(path.join(destination, '_merge_work')), false);
    assert.deepEqual(fs.readFileSync(campaign), campaignBytes, 'Original W3N must stay unchanged');
    assert.equal(progress.at(-1).phase, 'complete');

    // A native write exception must release both archives, including on Windows.
    (globalThis as any).__campaignFailWrite = true;
    const failedOut = path.join(root, 'failed-out');
    try {
        await assert.rejects(extractCampaignW3nMerged(campaign, failedOut), /Failed to add file/);
    } finally { delete (globalThis as any).__campaignFailWrite; }
    await fs.remove(failedOut);

    const unicodeCampaign = path.join(root, '自定义战役.w3n');
    await fs.copy(campaign, unicodeCampaign);
    const unicodeOutput = path.join(root, '魔兽目录', '_QMCampaign', '战役');
    const unicodeResult = await extractCampaignW3nMerged(unicodeCampaign, unicodeOutput);
    assert.equal(unicodeResult.maps.length, 2);
    assert.ok(unicodeResult.maps.every((entry: string) => entry.startsWith(unicodeOutput) && fs.existsSync(entry)));
    assert.equal(await fs.pathExists(path.join(unicodeOutput, '_merge_work')), false);
    console.log('Campaign merge passed: reserved metadata, regenerated listfile, W3X/W3M, shared replacement, original map bytes, exception cleanup, Unicode paths.');
} finally {
    await fs.remove(root);
    delete (globalThis as any).__campaignStormLib;
    delete (globalThis as any).__campaignFailWrite;
}
