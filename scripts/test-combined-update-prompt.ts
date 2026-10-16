import assert from 'node:assert/strict';
import { buildCombinedUpdatePrompt } from '../src/shared/combined-update-prompt';

const clientOnly = buildCombinedUpdatePrompt(
  { decision: 'available', currentVersion: '3.5.0' },
  '3.5.1',
  { decision: 'upToDate', current: { version: '3.5' }, target: { version: '3.5', displayVersion: '3.5' } },
);
assert.equal(clientOnly?.client?.automatic, true);
assert.equal(clientOnly?.mod, null);

const modOnly = buildCombinedUpdatePrompt(
  { decision: 'upToDate', currentVersion: '3.5.1' },
  '',
  { decision: 'patch', current: { version: '3.5' }, target: { version: '3.51', displayVersion: '3.51' } },
);
assert.equal(modOnly?.client, null);
assert.equal(modOnly?.mod?.currentVersion, '3.5');
assert.equal(modOnly?.mod?.automatic, true);

const both = buildCombinedUpdatePrompt(
  { decision: 'available', currentVersion: '3.5.0' },
  '3.5.1',
  { decision: 'patch', current: { version: '3.5' }, target: { version: '3.51', displayVersion: '3.51' } },
);
assert.ok(both?.client && both.mod);
assert.match(both!.signature, /3\.5\.1/);
assert.match(both!.signature, /3\.51/);

const manualPackage = buildCombinedUpdatePrompt(
  null,
  '',
  { decision: 'requiresFullPackage', current: null, target: { version: '3.6', displayVersion: '3.6' } },
);
assert.equal(manualPackage, null, 'a missing package is a first install, not an available update');
assert.equal(buildCombinedUpdatePrompt(null, '', {
  decision: 'unknownInstallation', current: null, target: { version: '3.6', displayVersion: '3.6' },
}), null);
const existingManualPackage = buildCombinedUpdatePrompt(null, '', {
  decision: 'requiresFullPackage', current: { version: '3.4' }, target: { version: '3.6', displayVersion: '3.6' },
});
assert.equal(existingManualPackage?.mod?.automatic, false);
assert.equal(existingManualPackage?.mod?.currentVersion, '3.4');
const clientWithNoPackage = buildCombinedUpdatePrompt(
  { decision: 'available', currentVersion: '3.5.0' }, '3.5.1',
  { decision: 'requiresFullPackage', current: null, target: { version: '3.6', displayVersion: '3.6' } },
);
assert(clientWithNoPackage?.client);
assert.equal(clientWithNoPackage?.mod, null, 'a client update must not imply a missing MOD needs updating');

assert.equal(buildCombinedUpdatePrompt(
  { decision: 'upToDate', currentVersion: '3.5.1' },
  '',
  { decision: 'unavailable', current: null, target: null },
), null);

console.log('Combined update prompt checks passed');
