async page => {
  const base = 'http://127.0.0.1:4421/?installLayout=1';
  const dialog = page.locator('.full-package-install-modal');
  const entry = page.locator('.home-install-full-package');
  const results = [];
  const check = (ok, description) => { if (!ok) throw new Error(description); };
  await page.setViewportSize({ width: 960, height: 635 });
  await page.goto(base + '&installed=1');
  await entry.filter({ hasText: '重新安装完整包' }).waitFor();
  await entry.click();
  await dialog.waitFor();
  await dialog.locator('.full-package-install-sources').waitFor();
  await page.waitForFunction(() => Math.abs(document.querySelector('.full-package-install-modal .ant-modal-content').getBoundingClientRect().width - 660) < 1);
  check(await dialog.locator('.ant-modal-title').innerText() === '重新安装完整包', 'Installed dialog title');
  const layout = await dialog.evaluate(el => {
    const panel = el.querySelector('.ant-modal-content');
    const box = panel.getBoundingClientRect();
    const style = getComputedStyle(panel);
    return { width: box.width, height: box.height, top: box.top, bottom: box.bottom,
      radius: style.borderRadius, path: el.querySelector('code').textContent,
      transform: getComputedStyle(el.querySelector('code')).textTransform,
      overflow: [...el.querySelectorAll('code, .full-package-source-card')].some(node => node.scrollWidth > node.clientWidth + 1) };
  });
  check(layout.radius === '18px' && layout.top >= 0 && layout.bottom <= 635 && !layout.overflow, 'Modal layout / viewport / overflow');
  check(layout.transform === 'none' && layout.path.includes('淬火测试') && layout.path.endsWith('_retail_') && layout.path.includes('Warcraft III'), 'Path casing / Chinese / branch: ' + JSON.stringify(layout));
  await page.screenshot({ path: 'output/playwright/full-package-reinstall-zh.png', animations: 'disabled' });
  await dialog.locator('.full-package-install-download button').click();
  check((await page.evaluate(() => window.updateTest.calls)).some(call => call.startsWith('link:')), 'Download entry');
  await dialog.getByRole('button', { name: '返回选择目录', exact: true }).click();
  await dialog.getByRole('button', { name: /使用此目录/ }).waitFor();
  await dialog.getByRole('button', { name: /使用此目录/ }).click();
  await dialog.locator('.full-package-install-sources').waitFor();
  await dialog.getByRole('button', { name: '更换目录', exact: true }).click();
  await page.waitForFunction(() => window.updateTest.calls.includes('choose-directory'));
  await dialog.locator('.full-package-source-card').first().click();
  await dialog.waitFor({ state: 'hidden' });
  let calls = await page.evaluate(() => window.updateTest.calls);
  check(calls.some(call => call === 'install:fixture/QMF3.5-Full-A.zip,fixture/QMF3.5-Full-B.zip'), 'ZIP installation dispatch');
  results.push({ state: 'installed', layout, calls });

  await page.goto(base + '&installed=0');
  await entry.filter({ hasText: /^安装完整包$/ }).waitFor();
  await entry.click();
  await dialog.waitFor();
  await dialog.locator('.full-package-install-sources').waitFor();
  check(await dialog.locator('.ant-modal-title').innerText() === '安装完整包', 'Not-installed title');
  await page.evaluate(() => { window.updateTest.cancelSelection = true; });
  await dialog.locator('.full-package-source-card').first().click();
  await page.waitForFunction(() => !document.querySelector('.full-package-source-card').disabled);
  check(await dialog.isVisible(), 'Cancelling file picker should keep dialog open');
  await dialog.locator('.full-package-source-card').last().click();
  await dialog.waitFor({ state: 'hidden' });
  await entry.filter({ hasText: '重新安装完整包' }).waitFor();
  calls = await page.evaluate(() => window.updateTest.calls);
  check(calls.filter(call => call.startsWith('install:')).join() === 'install:fixture/QMF3.5', 'Folder installation dispatch');
  results.push({ state: 'not-installed / cancelled / installed', calls });

  for (const lang of ['en-US', 'fr-FR', 'pl-PL']) {
    await page.goto(base + '&installed=1&lang=' + lang);
    await entry.waitFor();
    await entry.click();
    await dialog.waitFor();
    await dialog.locator('.full-package-install-sources').waitFor();
    const fits = await dialog.evaluate(el => {
      const box = el.querySelector('.ant-modal-content').getBoundingClientRect();
      return box.top >= 0 && box.bottom <= innerHeight && ![...el.querySelectorAll('.full-package-source-card, .full-package-source-description')].some(n => n.scrollWidth > n.clientWidth + 1);
    });
    check(fits, 'Localized layout: ' + lang);
    check(!(await dialog.innerText()).includes('install.fullPackage.'), 'Missing translation: ' + lang);
    results.push({ language: lang, fits });
  }
  await page.goto(base + '&installed=1&noPath=1');
  await entry.waitFor();
  check(await entry.isDisabled(), 'Installation must require a game directory');
  await page.locator('.home-directory-choice').click();
  await entry.click();
  await dialog.locator('.full-package-install-sources').waitFor();
  await dialog.getByRole('button', { name: '返回选择目录', exact: true }).click();
  await dialog.getByRole('button', { name: /使用此目录/ }).click();
  await dialog.locator('.full-package-install-sources').waitFor();
  results.push({ state: 'no-directory', selected: true });

  await page.goto(base + '&installed=1&channel=ptr');
  await entry.waitFor();
  await entry.click();
  await dialog.waitFor();
  await dialog.locator('.full-package-install-sources').waitFor();
  check((await dialog.locator('code').innerText()).endsWith('_ptr_'), 'PTR installation target');
  await page.setViewportSize({ width: 560, height: 700 });
  await page.screenshot({ path: 'output/playwright/full-package-reinstall-narrow.png', animations: 'disabled' });
  const errors = (await page.evaluate(() => window.updateTest.errors)).filter(e => !e.startsWith('Warning: [antd:'));
  check(!errors.length, 'Runtime errors: ' + JSON.stringify(errors));
  results.push({ state: 'ptr', errors });
  return results;
}
