// playwright-cli -s=paladin run-code --filename=scripts/research/verify-forsaken-paladin.playwright.js
// Requires the read-only serve-skin-panel.ts fixture. No game files are changed.
async (page) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  page.removeAllListeners('response');
  const resources = [];
  page.on('response', async response => {
    if (response.url().includes('/resource?') && response.ok()) {
      try { resources.push({ url: response.url(), path: (await response.json()).resolvedPath }); }
      catch { /* A previous model's texture request can finish during navigation. */ }
    }
  });
  const reports = [];
  for (const artSet of ['sd', 'hd', 'de']) {
    await page.goto(`http://127.0.0.1:4420/?mode=${artSet}`);
    await page.getByRole('button', { name: '中立', exact: true }).click();
    const hero = page.getByRole('button', { name: '被遗忘的圣骑士', exact: true });
    await hero.click();
    await page.waitForFunction(() => document.querySelector('canvas')?.style.opacity === '1', null, { timeout: 60000 });
    if (await page.getByText('加载失败', { exact: true }).count() || await page.getByText(/缺少 \d+ 项资源/).count()) {
      throw new Error(`${artSet} Forsaken Paladin preview failed or has missing textures`);
    }
    const avatar = await hero.locator('img').evaluate(img => ({ loaded: img.complete, width: img.naturalWidth, source: img.getAttribute('src') }));
    if (!avatar.loaded || avatar.width !== 64 || !avatar.source.endsWith('skin-icon-npal.png')) throw new Error('Incorrect Forsaken Paladin icon');
    const prefix = artSet === 'sd' ? 'casc://war3.w3mod:' : `casc://war3.w3mod:_${artSet}.w3mod:`;
    const model = resources.find(resource => new URL(resource.url).searchParams.get('artSet') === artSet
      && resource.path.toLowerCase().includes('heroforsakenpaladin') && resource.path.toLowerCase().endsWith('.mdx'));
    if (!model || !model.path.toLowerCase().startsWith(prefix)) throw new Error(`Incorrect ${artSet} model namespace: ${JSON.stringify(model)}`);
    await page.screenshot({ path: `output/playwright/forsaken-paladin-${artSet}.png` });
    reports.push({ artSet, model: model.path, avatar, rendered: true });
  }
  page.removeAllListeners('response');
  return reports;
}
