// Read-only skin-panel fixture: all skin mutations are browser-local.
async (page) => {
  page.removeAllListeners('response');
  // Recover only this test's browser-local records after an interrupted run.
  await page.evaluate(() => {
    const custom = JSON.parse(localStorage.getItem('skin-test-custom') || '[]');
    const ids = new Set(custom.filter(record => record.targetId === 'Npal' && /^新英雄-(sd|hd|de)-隔离测试$/.test(record.name)).map(record => record.id));
    const selections = JSON.parse(localStorage.getItem('skin-test-selections') || '{}');
    for (const artSet of ['sd', 'hd', 'de']) if (ids.has(selections[artSet]?.Npal)) selections[artSet].Npal = 'original';
    localStorage.setItem('skin-test-custom', JSON.stringify(custom.filter(record => !ids.has(record.id))));
    localStorage.setItem('skin-test-selections', JSON.stringify(selections));
  });
  const records = [];
  for (const artSet of ['sd', 'hd', 'de']) {
    await page.goto(`http://127.0.0.1:4420/?mode=${artSet}`);
    await page.getByRole('button', { name: '中立', exact: true }).click();
    await page.getByRole('button', { name: '被遗忘的圣骑士', exact: true }).click();
    await page.getByRole('button', { name: '添加自定义皮肤', exact: true }).click();
    const editor = page.getByRole('dialog');
    const name = `新英雄-${artSet}-隔离测试`;
    await editor.getByRole('textbox', { name: '名称 必填', exact: true }).fill(name);
    await editor.getByRole('textbox', { name: `${artSet.toUpperCase()} 模型路径 可缺省`, exact: true })
      .fill('Units\\Creeps\\HeroForsakenPaladin\\HeroForsakenPaladin');
    await editor.getByRole('button', { name: '保存到皮肤库', exact: true }).click();
    await editor.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '删除自定义皮肤', exact: true }).waitFor();
    await page.getByRole('button', { name: '选定', exact: true }).click();
    const record = await page.evaluate(({ name, artSet }) => {
      const custom = JSON.parse(localStorage.getItem('skin-test-custom') || '[]');
      const selections = JSON.parse(localStorage.getItem('skin-test-selections') || '{}');
      const record = custom.find(record => record.name === name && record.artSet === artSet && record.targetId === 'Npal');
      return record && selections[artSet]?.Npal === record.id ? record : null;
    }, { name, artSet });
    if (!record || record.category !== 'hero' || record.race !== 'neutral') throw new Error(`Incorrect ${artSet} custom target/selection`);
    records.push(record);
  }
  for (const record of records) {
    await page.goto(`http://127.0.0.1:4420/?mode=${record.artSet}`);
    await page.getByRole('button', { name: '中立', exact: true }).click();
    await page.getByRole('button', { name: '被遗忘的圣骑士', exact: true }).click();
    await page.getByText(record.name, { exact: true }).waitFor();
    for (const other of records.filter(other => other.artSet !== record.artSet)) {
      if (await page.getByText(other.name, { exact: true }).count()) throw new Error('Cross-version custom skin in UI');
    }
    await page.getByRole('button', { name: '删除自定义皮肤', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: /删\s*除/ }).click();
    await page.getByRole('button', { name: '删除自定义皮肤', exact: true }).waitFor({ state: 'detached' });
    const saved = await page.evaluate(() => ({ custom: JSON.parse(localStorage.getItem('skin-test-custom') || '[]'),
      selections: JSON.parse(localStorage.getItem('skin-test-selections') || '{}') }));
    if (saved.custom.some(item => item.id === record.id) || saved.selections[record.artSet]?.Npal !== 'original') {
      throw new Error(`Delete did not reset ${record.artSet} Npal to original`);
    }
    for (const pending of records.slice(records.indexOf(record) + 1)) {
      if (saved.selections[pending.artSet]?.Npal !== pending.id) throw new Error('Delete changed a different version');
    }
  }
  return { target: 'Npal', versions: records.map(record => record.artSet), createApplyReloadDelete: 'PASS', isolated: true };
}
