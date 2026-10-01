import { GraphicsSelection } from './mod-profile';
import { SkinArtSet } from './skin-versions';

/** The same graphics choice that drives game resources also drives the skin page. */
export function activeSkinArtSet(
  graphics: GraphicsSelection | undefined,
  _hdPreference?: boolean,
  classicMode?: boolean,
  _detected?: SkinArtSet | null,
): SkinArtSet {
  if (classicMode) return 'sd';
  if (graphics === 'sd' || graphics === 'hd' || graphics === 'de') return graphics;
  return 'hd';
}
