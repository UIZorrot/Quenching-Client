import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { buildBattleNetLaunch, isSameWar3Root, spawnDetached } from '../src/Main/services/battle-net-launcher';

// Battle.net only reuses its session for the install it manages.
assert.equal(isSameWar3Root('C:\\Program Files (x86)\\Warcraft III', 'C:\\Program Files (x86)\\Warcraft III\\'), true);
assert.equal(isSameWar3Root('c:/program files (x86)/warcraft iii', 'C:\\Program Files (x86)\\Warcraft III'), true);
assert.equal(isSameWar3Root('D:\\Games\\Warcraft III', 'C:\\Program Files (x86)\\Warcraft III'), false);
assert.equal(isSameWar3Root('', 'C:\\Program Files (x86)\\Warcraft III'), false);

const { args, options } = buildBattleNetLaunch('C:\\Program Files (x86)\\Battle.net\\Battle.net.exe');
assert.deepEqual(args, ['--exec="launch W3"']);
assert.equal(options.argv0, '"C:\\Program Files (x86)\\Battle.net\\Battle.net.exe"');

// On Windows, check how a child process actually parses the verbatim command line.
if (process.platform === 'win32') {
    const probe = buildBattleNetLaunch(process.execPath);
    const result = spawnSync(process.execPath, ['-e', 'console.log(JSON.stringify(process.argv.slice(1)))', '--', ...probe.args], {
        argv0: probe.options.argv0,
        windowsVerbatimArguments: true,
        encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), ['--exec=launch W3']);
}

// A missing exe resolves false (caller falls back) instead of an unhandled 'error' event.
assert.equal(await spawnDetached('C:\\missing\\Battle.net.exe', [], { detached: true, stdio: 'ignore' }), false);
assert.equal(await spawnDetached(process.execPath, ['-e', ''], { detached: true, stdio: 'ignore' }), true);

console.log('Battle.net launch test passed');
