async page => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.evaluate(() => { localStorage.removeItem('skin-test-custom'); localStorage.removeItem('skin-test-selections'); });
  await page.reload();
  await page.getByRole('heading', { name: 'Hero skins', exact: true }).waitFor();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const results = [];
  const label = key => page.evaluate(key => window.skinLanguageTest.t(key), key);
  const expectTranslated = async locale => {
    const content = await page.locator('#root').innerText();
    if (locale !== 'zh-CN' && /[\u3400-\u9fff]/u.test(content)) throw new Error(`${locale}: Chinese UI text remains: ${content}`);
    if (/skin\.(panel|editor|preview|building|hero|unit)\./.test(content)) throw new Error(`${locale}: untranslated key`);
    if (/\{\{?[\w.]+\}\}?/.test(content)) throw new Error(`${locale}: unexpanded parameters`);
  };
  for (const locale of ['en-US', 'fr-FR', 'pt-BR', 'ru-RU', 'es-ES', 'ko-KR', 'zh-CN']) {
    await page.evaluate(locale => window.skinLanguageTest.setLanguage(locale), locale);
    await page.getByRole('heading', { name: await label('skin.panel.title.hero'), exact: true }).waitFor();
    await expectTranslated(locale);
    const categories = await page.locator('nav button').evaluateAll(buttons => buttons.map(button => ({ text: button.textContent, overflow: button.scrollWidth > button.clientWidth + 2 })));
    if (categories.some(c => c.overflow)) throw new Error(`${locale}: category label overflow ${JSON.stringify(categories)}`);
    await page.getByRole('button', { name: await label('skin.category.building'), exact: true }).click();
    await page.getByRole('heading', { name: await label('skin.panel.title.building'), exact: true }).waitFor();
    await page.getByRole('button', { name: await label('skin.building.htow'), exact: true }).waitFor();
    await expectTranslated(locale);
    await page.getByRole('button', { name: await label('skin.category.unit'), exact: true }).click();
    await page.getByRole('heading', { name: await label('skin.panel.title.unit'), exact: true }).waitFor();
    await page.getByRole('button', { name: await label('skin.panel.mode.warband'), exact: true }).click();
    await expectTranslated(locale);
    await page.getByRole('button', { name: await label('skin.panel.mode.retro'), exact: true }).click();
    await expectTranslated(locale);
    await page.getByRole('button', { name: await label('skin.category.hero'), exact: true }).click();
    await page.getByRole('button', { name: await label('skin.editor.title'), exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await expectTranslated(locale);
    await page.getByRole('button', { name: await label('skin.editor.external'), exact: false }).click();
    await page.getByRole('button', { name: await label('skin.model.select'), exact: true }).click();
    await page.getByRole('button', { name: await label('skin.import.autoSearch'), exact: true }).waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.body.innerText.includes(window.skinLanguageTest.t('skin.editor.linkCount', { linked: 1, total: 2 })));
    await expectTranslated(locale);
    await page.getByRole('button', { name: await label('skin.editor.close'), exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    results.push({ locale, categories: categories.map(c => c.text), editorLinked: '1/2' });
  }
  await page.evaluate(() => {
    localStorage.setItem('skin-test-custom', JSON.stringify([{ id: 'custom_i18n_fixture', artSet: 'hd', targetId: 'Hamg', category: 'hero', name: '玩家自己的中文皮肤', config: [] }]));
    localStorage.setItem('skin-test-selections', JSON.stringify({ hd: { Hamg: 'custom_i18n_fixture' } }));
  });
  await page.reload();
  await page.waitForFunction(() => !!window.skinLanguageTest);
  await page.evaluate(() => window.skinLanguageTest.setLanguage('en-US'));
  await page.getByText('玩家自己的中文皮肤', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Delete custom skin', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText(/玩家自己的中文皮肤/).waitFor();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete custom skin', exact: true }).waitFor({ state: 'detached' });
  await expectTranslated('en-US');
  await page.screenshot({ path: 'output/playwright/skin-i18n-en.png' });
  if (errors.length) throw new Error(errors.join('\n'));
  return { languages: results, customNamePreserved: true, deleteLocalized: true, pageErrors: errors };
}
