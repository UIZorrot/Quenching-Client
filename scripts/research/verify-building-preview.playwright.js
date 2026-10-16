// playwright-cli -s=base-upgrades run-code --filename=scripts/research/verify-building-preview.playwright.js
// Requires serve-de-preview.ts and output/playwright. Models stay in local CASC.
async (page) => {
  const reports = [];
  for (const artSet of ['sd', 'hd', 'de']) {
    const prefix = artSet === 'sd' ? '' : `_${artSet}.w3mod:`;
    const stages = [];
    for (const [tier, unitId] of ['htow', 'hkee', 'hcas'].entries()) {
      const report = await page.evaluate(async ({ prefix, unitId }) => {
        await window.loadDE(`war3.w3mod:${prefix}buildings/human/TownHall/TownHall.mdx`, unitId);
        const preview = window.dePreview;
        preview.draw(0);
        return { unitId, sequence: preview.parser.sequences[preview.instance.sequence].name,
          visible: preview.instance.geosetColors.flatMap((color, index) => color[3] > 0.01 ? [index] : []),
          missing: preview.missing, pixels: window.inspectDE() };
      }, { prefix, unitId });
      if (!report.visible.length || report.pixels.changedPixels < 1000 || report.pixels.glError || report.missing.length)
        throw new Error(`Invalid ${artSet}/tier${tier + 1}: ${JSON.stringify(report)}`);
      await page.screenshot({ path: `output/playwright/townhall-${artSet}-tier${tier + 1}.png` });
      stages.push(report);
    }
    if (new Set(stages.map(stage => stage.visible.join(','))).size !== 3)
      throw new Error(`${artSet} upgrade stages still share visible geometry`);
    reports.push({ artSet, stages });
  }
  await page.evaluate(reports => { window.buildingPreviewReport = reports; }, reports);
  console.log(JSON.stringify(reports));
}
