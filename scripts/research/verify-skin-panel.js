async page => {
  const resources = [];
  page.on('response', async response => {
    if (response.url().includes('/resource?') && response.ok()) resources.push((await response.json()).resolvedPath);
  });
  await page.evaluate(() => { localStorage.removeItem('skin-test-custom'); localStorage.removeItem('skin-test-selections'); });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('canvas')?.style.opacity === '1');
  await page.getByRole('button', { name: '下一个皮肤' }).click();
  await page.waitForFunction(() => document.querySelector('canvas')?.style.opacity === '1');
  if (await page.getByText(/缺少 \d+ 项资源/).count()) throw new Error('SD preview is missing textures');
  if (!resources.length || resources.some(name => name.includes('_hd.w3mod:') || name.includes('_de.w3mod:'))) throw new Error('SD preview reads the wrong art-set layer');
  await page.screenshot({ path: '_irys/work/skin-351-sd-verified.png' });
  await page.evaluate(() => {
    localStorage.setItem('skin-test-custom', JSON.stringify([{ id: 'custom_delete_fixture', artSet: 'sd', targetId: 'Hamg', category: 'hero', source: 'game-paths', name: '删除回归测试', config: [] }]));
    localStorage.setItem('skin-test-selections', JSON.stringify({ sd: { Hamg: 'custom_delete_fixture' } }));
  });
  await page.reload();
  await page.getByRole('button', { name: '删除自定义皮肤' }).waitFor();
  await page.getByRole('button', { name: '删除自定义皮肤' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /删\s*除/ }).click();
  await page.getByRole('button', { name: '删除自定义皮肤' }).waitFor({ state: 'detached' });
  const saved = await page.evaluate(() => ({ custom: JSON.parse(localStorage.getItem('skin-test-custom')), selections: JSON.parse(localStorage.getItem('skin-test-selections')) }));
  if (saved.custom.some(skin => skin.id === 'custom_delete_fixture') || saved.selections.sd.Hamg !== 'original') throw new Error('Skin delete did not reset the stored selection');
  return { classicResourceCount: resources.length, deletedCustomSkin: true, restoredSelection: saved.selections.sd.Hamg };
}
