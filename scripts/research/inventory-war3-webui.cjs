// Static analysis only: never evaluates the supplied Warcraft JavaScript.
// Usage: node scripts/research/inventory-war3-webui.cjs INPUT OUTPUT [LEGACY_INPUT]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');

function analyze(input) {
  const data = fs.readFileSync(input);
  if (data.length > 32 * 1024 * 1024) throw new Error('Input exceeds 32 MiB');
  const source = ts.createSourceFile(input, data.toString('utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (source.parseDiagnostics.length) throw new Error('JavaScript parse failed');
  const groups = { commands: new Map(), events: new Map() };
  const dynamic = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const group = method === 'sendMessage' ? 'commands' : method === 'addListener' ? 'events' : null;
      if (group) {
        const first = node.arguments[0];
        const at = source.getLineAndCharacterOfPosition(node.getStart(source));
        const site = { offset: node.getStart(source), line: at.line + 1, column: at.character + 1,
          receiver: node.expression.expression.getText(source),
          argument: node.arguments[1]?.getText(source).slice(0, 1600) ?? null,
          fields: node.arguments[1] && ts.isObjectLiteralExpression(node.arguments[1])
            ? node.arguments[1].properties.map(p => p.name?.getText(source)).filter(Boolean) : [] };
        if (first && ts.isStringLiteralLike(first)) {
          const current = groups[group].get(first.text) ?? [];
          current.push(site);
          groups[group].set(first.text, current);
        } else dynamic.push({ group, ...site });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { input: path.resolve(input), bytes: data.length,
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
    note: 'Static literal call sites, not runtime support. Internal helper calls and computed names may be absent.',
    commands: Object.fromEntries([...groups.commands].sort(([a], [b]) => a.localeCompare(b))),
    events: Object.fromEntries([...groups.events].sort(([a], [b]) => a.localeCompare(b))), dynamic };
}

const [input, output, legacy] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: inventory-war3-webui.cjs INPUT OUTPUT [LEGACY_INPUT]');
const result = analyze(input);
if (legacy) {
  const before = analyze(legacy);
  result.comparison = { legacy: before.input, legacySha256: before.sha256 };
  for (const group of ['commands', 'events']) result.comparison[group] = {
    oldCount: Object.keys(before[group]).length, newCount: Object.keys(result[group]).length,
    added: Object.keys(result[group]).filter(x => !before[group][x]),
    removed: Object.keys(before[group]).filter(x => !result[group][x]) };
}
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ output: path.resolve(output), sha256: result.sha256,
  commands: Object.keys(result.commands).length, events: Object.keys(result.events).length,
  dynamicSites: result.dynamic.length }));
