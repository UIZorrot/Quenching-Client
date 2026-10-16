import { SKIN_CONFIG } from '../assets/data/skin-config';

type Translate = (key: string, fallback?: string) => string;
// Keep historical translation keys without changing the Warcraft unit IDs used for applying skins.
const unitAliases: Record<string, string> = {
  hmtt: 'hmtp', hspt: 'hsbe', orai: 'ora2', okod: 'okot', otbr: 'obat',
  esen: 'ehun',
};
const heroByUnit = new Map(Object.values(SKIN_CONFIG).flatMap(race => race.heroes.map(hero => [hero.unitId, hero.id] as const)));
export function targetLabel(unitId: string, category: string, fallback: string, t: Translate): string {
  const hero = heroByUnit.get(unitId);
  return t(hero ? `skin.hero.${hero}` : category === 'building' ? `skin.building.${unitId}` : `skin.unit.${unitAliases[unitId] || unitId}`, fallback);
}
export function builtInSkinLabel(id: string, race: string, unitId: string, fallback: string, t: Translate): string {
  if (id === 'original') return t('skin.panel.original', fallback);
  const presetId = id.split(':')[0];
  if (/_u\d+$/.test(presetId)) return t(`skin.warband.${presetId}`, fallback);
  const hero = heroByUnit.get(unitId);
  return hero ? t(`skin.hero.${hero}.skin.${id}`, fallback) : fallback;
}
