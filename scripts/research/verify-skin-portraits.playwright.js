// Requires the read-only serve-skin-panel.ts fixture, with the editor already open.
async (page) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const editor = page.getByRole('dialog');
  await editor.getByRole('button', { name: '⌘ 游戏内路径 直接引用魔兽资源，未填写的字段沿用原单位', exact: true }).click();
  const portrait = editor.getByRole('textbox', { name: /^3D 肖像模型/ });
  if (await portrait.inputValue() !== '') throw new Error('Default portrait is not automatic');
  await page.screenshot({ path: 'output/playwright/skin-portrait-gamepaths.png' });
  // Only fixture APIs are mocked; actual editor/state/guided texture controls are unchanged.
  await page.evaluate(() => {
    window.portraitUI = { created: [], inspect: [] };
    window.electronAPI.inspectCustomSkinModel = async (modelPath, artSet, portraitPath) => {
      window.portraitUI.inspect.push({ modelPath, artSet, portraitPath });
      return { modelPath, portraitPath: portraitPath || 'C:\\Example\\Knight_portrait.mdx', references: ['Textures\\Body.blp', 'Textures\\Portrait.blp'],
        siblingCandidates: [], unresolved: ['Textures\\Portrait.blp'], textureBindings: { 'Textures\\Body.blp': 'C:\\Example\\Body.blp' },
        gameReferences: [], gameTextureBindings: {} };
    };
    window.electronAPI.selectFile = async options => options.filters?.[0]?.extensions.includes('mdx')
      ? 'C:\\Example\\Manual_portrait.mdx' : 'C:\\Example\\Portrait.blp';
    window.electronAPI.createCustomSkin = async input => {
      window.portraitUI.created.push(input);
      return { ...input, id: 'portrait_ui_fixture', config: [], createdAt: new Date().toISOString() };
    };
  });
  await editor.getByRole('button', { name: '＋ 外部资源 导入模型与图标，并引导完成贴图关联', exact: true }).click();
  await editor.getByRole('textbox', { name: '名称 必填', exact: true }).fill('可选图标和肖像回归');
  await editor.getByRole('button', { name: '选择模型', exact: true }).click();
  await portrait.waitFor();
  if (!(await portrait.inputValue()).endsWith('Knight_portrait.mdx')) throw new Error('Companion portrait not shown');
  await editor.getByText('Portrait.blp', { exact: true }).waitFor();
  const icons = editor.getByRole('button', { name: '选择图标', exact: true });
  for (const prefix of ['BTN 图标', 'DISBTN 图标']) {
    const input = editor.getByRole('textbox', { name: new RegExp(`^${prefix} 可缺省`) });
    if (await input.inputValue() !== '') throw new Error('Icon defaults must be empty/original');
  }
  await editor.getByRole('button', { name: '保存到皮肤库', exact: true }).click();
  if (await page.evaluate(() => window.portraitUI.created.length)) throw new Error('Saved with unresolved portrait texture');
  await editor.getByRole('button', { name: '关联', exact: true }).click();
  await editor.getByRole('button', { name: '选择肖像', exact: true }).click();
  if (!(await portrait.inputValue()).endsWith('Manual_portrait.mdx')) throw new Error('Manual portrait selection not shown');
  await icons.nth(0).click();
  await editor.getByRole('button', { name: '保存到皮肤库', exact: true }).click();
  if (await page.evaluate(() => window.portraitUI.created.length)) throw new Error('Saved an incomplete custom icon pair');
  await editor.getByRole('button', { name: '沿用原单位', exact: true }).click();
  await page.screenshot({ path: 'output/playwright/skin-portrait-external.png' });
  await editor.getByRole('button', { name: '保存到皮肤库', exact: true }).click();
  await editor.waitFor({ state: 'detached' });
  const report = await page.evaluate(() => window.portraitUI);
  if (report.created.length !== 1 || !report.created[0].portraitPath.endsWith('Manual_portrait.mdx')
    || report.created[0].iconPath || report.created[0].disabledIconPath
    || !report.created[0].textureBindings['Textures\\Portrait.blp']) throw new Error('Portrait model/binding missing from save payload');
  return { automaticField: true, companionVisible: true, manualPortraitSaved: true, missingTextureBlocksSave: true,
    iconsOptional: true, incompleteIconPairBlocked: true, resetToOriginalIcons: true, guidedBindingAndSave: true };
}
