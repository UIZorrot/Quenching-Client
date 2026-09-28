// Isolate the legacy parser: malformed or unsupported counts must not hang the survey.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (process.argv[2] === '--one') {
  try {
    const Model = require('mdx-m3-viewer/dist/cjs/parsers/mdlx/model').default;
    const buffer = fs.readFileSync(process.argv[3]);
    const model = new Model();
    model.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    process.stdout.write(JSON.stringify({ ok: true, version: model.version,
      geosets: model.geosets.length, materials: model.materials.length }));
  } catch (error) {
    process.stdout.write(JSON.stringify({ ok: false, error: String(error).slice(0, 500) }));
    process.exitCode = 1;
  }
} else {
  const manifestFile = path.resolve(process.argv[2]);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const rows = manifest.samples.map(sample => {
    const result = spawnSync(process.execPath, ['--max-old-space-size=256', __filename,
      '--one', path.join(path.dirname(manifestFile), sample.file)],
    { timeout: 5000, maxBuffer: 4096, encoding: 'utf8', windowsHide: true });
    let probe;
    try { probe = JSON.parse(result.stdout); }
    catch { probe = { ok: false, error: result.error?.message || result.stderr?.slice(0, 500) || 'No output' }; }
    return { name: sample.name, ...probe, exitCode: result.status };
  });
  const report = { package: 'mdx-m3-viewer',
    version: require('mdx-m3-viewer/package.json').version, rows };
  const output = path.join(path.dirname(manifestFile), 'viewer-probe.json');
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ total: rows.length, parsed: rows.filter(row => row.ok).length,
    firstFailure: rows.find(row => !row.ok), output }));
}
