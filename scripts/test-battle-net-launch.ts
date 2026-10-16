import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { buildBattleNetLaunch, isSameWar3Root, spawnDetached } from '../src/Main/services/battle-net-launcher';
import { readBattleNetInstallPath } from '../src/Main/services/battle-net-install-db';

// Battle.net only reuses its session for the install it manages.
assert.equal(isSameWar3Root('C:\\Program Files (x86)\\Warcraft III', 'C:\\Program Files (x86)\\Warcraft III\\'), true);
assert.equal(isSameWar3Root('c:/program files (x86)/warcraft iii', 'C:\\Program Files (x86)\\Warcraft III'), true);
assert.equal(isSameWar3Root('D:\\Games\\Warcraft III', 'C:\\Program Files (x86)\\Warcraft III'), false);
assert.equal(isSameWar3Root('', 'C:\\Program Files (x86)\\Warcraft III'), false);
assert.equal(isSameWar3Root('D:\\魔兽世界 (测试)\\_retail_', 'd:/魔兽世界 (测试)'), true);
assert.equal(isSameWar3Root('D:\\魔兽世界 (测试)\\_ptr_', 'd:/魔兽世界 (测试)'), true);

const { args, options } = buildBattleNetLaunch('C:\\Program Files (x86)\\Battle.net\\Battle.net.exe');
assert.deepEqual(args, ['--exec="launch W3"']);
assert.equal(options.argv0, '"C:\\Program Files (x86)\\Battle.net\\Battle.net.exe"');
assert.deepEqual(buildBattleNetLaunch('C:\\战网\\Battle.net.exe', 'ptr', 'win32').args, ['--exec="launch W3T"']);
const mac = buildBattleNetLaunch('/Applications/Battle.net.app/Contents/MacOS/Battle.net', 'ptr', 'darwin');
assert.deepEqual(mac.args, ['--exec=launch W3T']);
assert.equal(mac.options.windowsVerbatimArguments, undefined);
assert.equal(mac.options.shell, undefined);
assert.equal(isSameWar3Root('/Applications/魔兽 III/_ptr_/x86_64/Warcraft III.app', '/Applications/魔兽 III', 'darwin'), true);
assert.equal(isSameWar3Root('/Volumes/Backup/Warcraft III', '/Applications/Warcraft III', 'darwin'), false);
assert.equal(isSameWar3Root('/Applications/warcraft III', '/Applications/Warcraft III', 'darwin'), false);

const varint = (n: number): Buffer => { const out=[]; do { out.push((n&127)|(n>127?128:0)); n=Math.floor(n/128); } while(n); return Buffer.from(out); };
const field = (id: number, data: string | Buffer) => { const value=Buffer.isBuffer(data)?data:Buffer.from(data);return Buffer.concat([varint(id*8+2),varint(value.length),value]); };
const record = (uid: string, location: string) => field(1,Buffer.concat([field(1,uid),field(2,'w3'),field(3,field(1,location)),field(4,'ignored-cache-not-parsed')]));
const db = Buffer.concat([record('w3','/Applications/Warcraft III'),record('w3t','/Applications/魔兽 PTR')]);
assert.equal(readBattleNetInstallPath(db,'w3'), '/Applications/Warcraft III');
assert.equal(readBattleNetInstallPath(db,'w3t'), '/Applications/魔兽 PTR');
assert.equal(readBattleNetInstallPath(record('w3','/Applications/Warcraft III'),'w3t'), null);
assert.equal(readBattleNetInstallPath(Buffer.from([0x80]),'w3'), null);
assert.equal(readBattleNetInstallPath(Buffer.from([0x0a,0xff]),'w3'), null);

// On Windows, check how a child process actually parses the verbatim command line.
if (process.platform === 'win32') {
    const unicode = 'D:\\魔兽 (测试) 🔥';
    const utf8 = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); Write-Output '${unicode}'`], { windowsHide: true, encoding: 'utf8' });
    assert.equal(utf8.status, 0, utf8.stderr);
    assert.equal(utf8.stdout.trim(), unicode, 'fixed registry query transport must preserve Chinese paths');
    const probe = buildBattleNetLaunch(process.execPath);
    const result = spawnSync(process.execPath, ['-e', 'console.log(JSON.stringify(process.argv.slice(1)))', '--', ...probe.args], {
        argv0: probe.options.argv0,
        windowsVerbatimArguments: true,
        encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), ['--exec=launch W3']);
    const ptr = buildBattleNetLaunch(process.execPath, 'ptr');
    const ptrResult = spawnSync(process.execPath, ['-e', 'console.log(JSON.stringify(process.argv.slice(1)))', '--', ...ptr.args], {
        argv0: ptr.options.argv0, windowsVerbatimArguments: true, encoding: 'utf8',
    });
    assert.equal(ptrResult.status,0,ptrResult.stderr);
    assert.deepEqual(JSON.parse(ptrResult.stdout), ['--exec=launch W3T']);
}

// A missing exe resolves false (caller falls back) instead of an unhandled 'error' event.
assert.equal(await spawnDetached('C:\\missing\\Battle.net.exe', [], { detached: true, stdio: 'ignore' }), false);
assert.equal(await spawnDetached(process.execPath, ['-e', ''], { detached: true, stdio: 'ignore' }), true);

console.log('Battle.net launch test passed');
