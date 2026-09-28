import { GraphicsSelection } from './mod-profile';
import { SkinArtSet } from './skin-versions';

/** The same graphics choice that drives game resources also drives the skin page. */
export function activeSkinArtSet(
  graphics: GraphicsSelection | undefined,
  hdPreference?: boolean,
  classicMode?: boolean,
  detected?: SkinArtSet | null,
): SkinArtSet {
  if (graphics === 'sd' || graphics === 'hd' || graphics === 'de') return graphics;
  if (classicMode) return 'sd';
  if (detected === 'sd' || detected === 'hd' || detected === 'de') return detected;
  if (hdPreference === false) return 'sd';
  return 'hd';
}
