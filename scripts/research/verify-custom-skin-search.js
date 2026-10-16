async page => {
  await page.evaluate(() => localStorage.removeItem('quenching-language'));
  await page.goto('http://127.0.0.1:4423/');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '＋ 外部资源 导入模型与图标，并引导完成贴图关联', exact: true }).click();
  await dialog.getByRole('button', { name: '选择模型', exact: true }).click();
  await dialog.getByText('已关联 2 / 3 · 仍需 1 项', { exact: true }).waitFor();
  if (!await dialog.getByText('已关联 2 / 3 · 仍需 1 项', { exact: true }).count()) throw new Error('Initial scan result missing');
  const stock = dialog.locator('.textureRow').filter({ hasText: 'Stock.blp' });
  if (await stock.getByRole('button').count()) throw new Error('A built-in texture still requires a file picker');
  await dialog.getByRole('button', { name: '关联', exact: true }).click();
  await dialog.getByText('已关联 3 / 3 · 已完成', { exact: true }).waitFor();
  await dialog.getByRole('button', { name: '自动搜索关联', exact: true }).click();
  await page.waitForFunction(() => window.skinSearchFixture.scans === 2 && document.querySelector('.textureBox')?.textContent.includes('已完成'));
  await page.evaluate(() => { window.skinSearchFixture.failNext = true; });
  await dialog.getByRole('button', { name: '自动搜索关联', exact: true }).click();
  await dialog.locator('.inspectionError').waitFor();
  await dialog.getByRole('button', { name: '自动搜索关联', exact: true }).click();
  await dialog.locator('.inspectionError').waitFor({ state: 'detached' });
  await dialog.getByRole('textbox', { name: '名称 必填', exact: true }).fill('自动关联回归测试');
  const icons = dialog.getByRole('button', { name: '选择图标', exact: true });
  await icons.nth(0).click(); await icons.nth(1).click();
  await dialog.getByRole('button', { name: '保存到皮肤库', exact: true }).click();
  await page.waitForFunction(() => !!window.skinSearchFixture.saved);
  const saved = await page.evaluate(() => window.skinSearchFixture.saved);
  if (saved.textureBindings['war3mapImported/Glow.blp'] !== 'C:\\fixture\\manual-glow.dds') throw new Error('Rescan discarded manual association');
  if (saved.textureBindings['Textures/Body.blp'] !== 'C:\\fixture\\nested\\body-4.dds') throw new Error('Rescan did not refresh auto-association');
  if (saved.textureBindings['Textures/Stock.blp']) throw new Error('Stock texture was incorrectly imported');

  await page.evaluate(() => localStorage.removeItem('quenching-language'));
  await page.goto('http://127.0.0.1:4423/?language=en-US');
  await page.waitForFunction(() => document.querySelector('#language')?.textContent === 'en-US');
  await page.getByRole('button', { name: '关闭添加皮肤', exact: true }).click();
  await page.getByRole('button', { name: 'Test manual French', exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#language')?.textContent === 'fr-FR');
  return { manualAssociationPreserved: true, autoAssociationRefreshed: true, builtinNoPicker: true, retryWorks: true,
    configuredLanguage: 'en-US', manualLanguageAfterReload: 'fr-FR', scansBeforeSave: 4 };
}
