async page => {
  await page.reload();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('heading', { name: 'English release notes', exact: true }).waitFor();
  const startup = await page.evaluate(() => [...window.newsLanguageFixture.calls]);
  if (startup.some(lang => lang !== 'en')) throw new Error('Non-Chinese startup fetched Chinese news');
  const verified = [];
  for (const locale of ['zh-CN', 'en-US', 'fr-FR', 'pt-BR', 'ru-RU', 'es-ES', 'ko-KR']) {
    await page.evaluate(locale => window.newsLanguageState.setLanguage(locale), locale);
    const expected = locale === 'zh-CN' ? '中文更新日志' : 'English release notes';
    await page.getByRole('heading', { name: expected, exact: true }).waitFor();
    const refresh = await page.evaluate(() => window.newsLanguageState.t('news.refresh'));
    await page.getByRole('button', { name: new RegExp(refresh) }).click();
    await page.getByRole('heading', { name: expected, exact: true }).waitFor();
    const last = await page.evaluate(() => window.newsLanguageFixture.calls.at(-1));
    if (last !== (locale === 'zh-CN' ? 'cn' : 'en')) throw new Error(locale + ': incorrect refresh language');
    verified.push(locale);
  }
  await page.evaluate(() => { window.newsLanguageFixture.holdChinese = true; window.newsLanguageState.setLanguage('zh-CN'); });
  await page.waitForFunction(() => window.newsLanguageFixture.chinese.length > 0);
  await page.evaluate(() => window.newsLanguageState.setLanguage('en-US'));
  await page.getByRole('heading', { name: 'English release notes', exact: true }).waitFor();
  await page.evaluate(() => { window.newsLanguageFixture.holdChinese = false; window.newsLanguageFixture.chinese.splice(0).forEach(resolve => resolve()); });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (await page.getByRole('heading', { name: '中文更新日志' }).count()) throw new Error('Late Chinese response overwrote English UI');
  await page.evaluate(() => window.newsLanguageFixture.refresh());
  await page.getByRole('heading', { name: 'English release notes', exact: true }).waitFor();
  if (await page.evaluate(() => window.newsLanguageFixture.calls.at(-1)) !== 'en') throw new Error('Periodic refresh returned to Chinese');
  await page.evaluate(() => { window.newsLanguageFixture.mode = 'empty'; window.newsLanguageFixture.refresh(); });
  const empty = await page.evaluate(() => window.newsLanguageState.t('news.empty'));
  await page.getByText(empty, { exact: true }).waitFor();
  await page.evaluate(() => { window.newsLanguageFixture.mode = 'failed'; window.newsLanguageFixture.refresh(); });
  const failed = await page.evaluate(() => window.newsLanguageState.t('news.failed'));
  await page.getByText(failed, { exact: true }).waitFor();
  await page.evaluate(() => { window.newsLanguageFixture.mode = 'normal'; });
  const retry = await page.evaluate(() => window.newsLanguageState.t('news.retry'));
  await page.getByRole('button', { name: new RegExp(retry) }).click();
  await page.getByRole('heading', { name: 'English release notes', exact: true }).waitFor();
  await page.screenshot({ path: 'output/playwright/news-language-en.png' });
  if (errors.length) throw new Error(errors.join('\n'));
  return { startup, verifiedLanguages: verified, staleChineseIgnored: true, periodicRefreshEnglish: true, emptyErrorRetryLocalized: true, pageErrors: errors };
}
