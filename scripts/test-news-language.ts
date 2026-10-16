import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const storage = new Map([['quenching-language', 'fr-FR']]);
const requests: { lang: string; resolve: (value: any[]) => void; reject: (error: Error) => void }[] = [];
const browser = new EventTarget();
Object.assign(browser, { electronAPI: { fetchNews: (lang: string) => new Promise((resolve, reject) => requests.push({ lang, resolve, reject })) } });
(globalThis as any).window = browser;
(globalThis as any).localStorage = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) };
let refresh: () => void;
const realSetInterval = globalThis.setInterval;
(globalThis as any).setInterval = (callback: () => void, delay: number, ...args: any[]) => {
  if (delay === 5 * 60 * 1000) { refresh = callback; return 1; }
  return realSetInterval(callback, delay, ...args);
};
const settle = () => new Promise(resolve => setImmediate(resolve));
const article = (title: string) => [{ id: title, title, content: title, date: '2026-10-03', type: 'update' }];
const rendererBundle = await build({
  stdin: { contents: "export { reaxel_News, newsLanguage } from './src/Renderer/utils/news'; export { reaxel_I18n } from './src/Renderer/utils/i18n';", resolveDir: process.cwd(), loader: 'ts' },
  platform: 'node', format: 'cjs', external: ['react'], bundle: true, write: false,
});
const renderer = { exports: {} as any };
new Function('require', 'module', 'exports', rendererBundle.outputFiles[0].text)(require, renderer, renderer.exports);
const { newsLanguage } = renderer.exports;
const news = renderer.exports.reaxel_News();
const i18n = renderer.exports.reaxel_I18n();
try {
  assert.equal(requests[0].lang, 'en', 'French startup must request English');
  requests[0].resolve(article('English startup'));
  await settle();
  assert.equal(news.store.news[0].title, 'English startup');
  for (const locale of ['zh-CN', 'en-US', 'fr-FR', 'pt-BR', 'ru-RU', 'es-ES', 'ko-KR']) {
    i18n.setLanguage(locale);
    const pending = news.fetchNews();
    assert.equal(requests.at(-1)!.lang, locale === 'zh-CN' ? 'cn' : 'en');
    assert.equal(newsLanguage(locale), locale === 'zh-CN' ? 'cn' : 'en');
    requests.at(-1)!.resolve(article(locale));
    await pending;
    assert.equal(news.store.news[0].title, locale);
  }
  i18n.setLanguage('zh-CN');
  const chinese = news.fetchNews();
  const slowChinese = requests.at(-1)!;
  const count = requests.length;
  await news.fetchNews();
  assert.equal(requests.length, count, 'same-language duplicate request is suppressed');
  i18n.setLanguage('ko-KR');
  const english = news.fetchNews();
  assert.equal(requests.length, count + 1, 'language switch must not be suppressed by an in-flight Chinese request');
  assert.equal(news.store.news.length, 0, 'do not show stale Chinese content during English loading');
  requests.at(-1)!.resolve(article('Latest English'));
  await english;
  slowChinese.resolve(article('Outdated Chinese'));
  await chinese;
  assert.equal(news.store.news[0].title, 'Latest English', 'late Chinese response cannot overwrite English');
  assert.equal(news.store.isLoading, false);
  refresh!();
  assert.equal(requests.at(-1)!.lang, 'en', 'five-minute refresh uses the current UI language');
  requests.at(-1)!.resolve([]);
  await settle();
  assert.deepEqual([...news.store.news], [], 'empty result must use the translated UI state, not a fabricated Chinese article');
  const failure = news.fetchNews(true);
  requests.at(-1)!.reject(new Error('offline fixture'));
  await failure;
  assert.equal(news.store.errorMessage, 'offline fixture');
  assert.equal(news.store.news.length, 0);
} finally { globalThis.setInterval = realSetInterval; }

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-news-language-'));
(globalThis as any).__newsCacheFixture = directory;
try {
  const mainBundle = await build({
    stdin: { contents: "export { NewsService } from './src/Main/services/news-service';", resolveDir: process.cwd(), loader: 'ts' },
    platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
    plugins: [{ name: 'news-cache-fixture', setup(plugin) {
      plugin.onResolve({ filter: /^electron$/ }, () => ({ path: 'electron', namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const app={getPath:()=>globalThis.__newsCacheFixture};' }));
    } }],
  });
  const main = { exports: {} as any };
  new Function('require', 'module', 'exports', mainBundle.outputFiles[0].text)(require, main, main.exports);
  const service = new main.exports.NewsService();
  const urls: string[] = [];
  service.downloadMarkdown = async (url: string) => { urls.push(url); return url.endsWith('newscn.md') ? '## 2026-10-03\n中文更新内容' : '## 2026-10-03\nEnglish update notes'; };
  for (const locale of ['cn', 'zh-CN', 'en', 'en-US', 'fr-FR', 'pt-BR', 'ru-RU', 'es-ES', 'ko-KR']) {
    const items = await service.fetchNews(locale);
    const chinese = locale === 'cn' || locale === 'zh-CN';
    assert.equal(urls.at(-1), `https://qm.txzy.net/news${chinese ? 'cn' : 'en'}.md`);
    assert.equal(items[0].content, chinese ? '中文更新内容' : 'English update notes');
    assert.equal(items[0].title, chinese ? '更新公告 2026-10-03' : 'Update 2026-10-03');
  }
  service.downloadMarkdown = async () => { throw new Error('offline fixture'); };
  assert.equal((await service.fetchNews('en'))[0].content, 'English update notes', 'offline English uses only English cache');
  const cache = await fs.readJson(path.join(directory, 'news_cache.json'));
  delete cache.en;
  await fs.writeJson(path.join(directory, 'news_cache.json'), cache);
  assert.deepEqual(await service.fetchNews('en'), [], 'never substitute Chinese cache for missing English cache');
} finally {
  assert.equal(path.dirname(directory), os.tmpdir());
  assert.ok(path.basename(directory).startsWith('quenching-news-language-'));
  await fs.remove(directory);
}
console.log('PASS: seven-locale startup/manual/timer selection, in-flight language switches, stale response isolation, translated empty/error states, actual news URLs and language-specific cache.');
