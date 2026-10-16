async page => {
  await page.getByRole('button', { name: '确定并更新' }).waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: '确定并更新' }).click();
  await page.getByRole('alertdialog').waitFor();
  const progress = await page.getByRole('alertdialog').innerText();
  await page.getByRole('alertdialog').waitFor({ state: 'detached' });
  await page.getByText('MOD v3.5', { exact: false }).first().waitFor();
  if (await page.getByRole('dialog').count()) throw new Error('Update confirmation remains mounted after finishing');
  // Both installation entry points must also return to the home page after 100%.
  for (const option of ['从已解压文件夹安装', '从 ZIP 安装（支持 A/B 两包）']) {
    await page.getByRole('button', { name: '安装资源包', exact: true }).click();
    await page.getByRole('menuitem', { name: option }).click();
    await page.getByRole('alertdialog').waitFor();
    await page.getByRole('alertdialog').waitFor({ state: 'detached' });
  }
  const result = await page.evaluate(() => window.updateTest);
  const errors = result.errors.filter(error => !error.startsWith('Warning: [antd:'));
  if (errors.length) throw new Error(JSON.stringify(errors));
  if (result.calls.filter(call => call.startsWith('install:')).length !== 2) throw new Error('Install entry points were not invoked');
  return { progress, result: { ...result, errors }, dialogCount: await page.getByRole('dialog').count() };
}
