import assert from 'node:assert/strict';
import { graphicsFromHdValue, patchWar3Preferences } from '../src/shared/war3-preferences';

const original = '[Graphics]\r\nhd=0\r\nreswidth=1920\r\n[CustomKeys]\r\nQ=CustomAbility\r\n// player comment\r\n';
const changed = patchWar3Preferences(original, { hd: true });
assert.equal(changed, original.replace('hd=0', 'hd=1'));
assert.throws(() => patchWar3Preferences(original, { windowmode: 2 }), /missing/);
assert.equal(graphicsFromHdValue('0'), 'sd');
assert.equal(graphicsFromHdValue('1'), 'hd');
assert.equal(graphicsFromHdValue('2'), 'de');
assert.equal(patchWar3Preferences('hd=1\r\n', { hd: 2 }), 'hd=2\r\n');
console.log('Warcraft preference patch preserves custom keys and sections');
