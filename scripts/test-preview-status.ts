import assert from 'node:assert/strict';
import { describePreviewError, resolvePreviewStatus, type Translate } from '../src/Renderer/components/MainWindow/preview-status';

const catalogs: Record<string, Record<string, string>> = {
  'en-US': { 'skin.panel.model.loadFailed': 'Model failed to load: {{detail}}', 'skin.panel.model.missing': '{{count}} resources missing' },
  'pl-PL': { 'skin.panel.model.loadFailed': 'Nie udało się wczytać modelu: {{detail}}', 'skin.panel.model.missing': 'Brakuje zasobów: {{count}}' },
};
const translator = (language: string): Translate => (key, fallback) => catalogs[language]?.[key] ?? fallback ?? key;

// The same retained status must follow the current language without being recomputed.
const failure = describePreviewError(new Error('boom $& {{count}}'));
assert.equal(resolvePreviewStatus(failure, translator('en-US')), 'Model failed to load: boom $& {{count}}');
assert.equal(resolvePreviewStatus(failure, translator('pl-PL')), 'Nie udało się wczytać modelu: boom $& {{count}}');

const missing = { key: 'skin.panel.model.missing', fallback: '缺少 {{count}} 项资源', params: { count: '3' } };
assert.equal(resolvePreviewStatus(missing, translator('en-US')), '3 resources missing');
assert.equal(resolvePreviewStatus(missing, translator('pl-PL')), 'Brakuje zasobów: 3');

// Unknown keys fall back to the source text, empty status renders nothing.
assert.equal(resolvePreviewStatus(missing, translator('ru-RU')), '缺少 3 项资源');
assert.equal(resolvePreviewStatus(null, translator('en-US')), '');

// Known error classes map to dedicated keys.
assert.equal(describePreviewError(new Error('No handler registered for x')).key, 'skin.panel.model.notReady');
assert.equal(describePreviewError(new Error('Loading chunk 5 failed')).key, 'skin.panel.model.chunk');

console.log('Preview status localization test passed');
