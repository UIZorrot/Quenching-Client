// Verified against Warcraft's Human/Orc/NightElf/UndeadUnitFunc Animprops.
const upgradeProperties: Record<string, string> = {
  hkee: 'first', hcas: 'second', ostr: 'first', ofrt: 'second',
  etoa: 'first', etoe: 'second', unp1: 'first', unp2: 'second',
  hgtw: 'first', hctw: 'second', hatw: 'third', uzg1: 'first', uzg2: 'second',
};

/** Shared building models must show the selected unit's upgrade, not the first Stand. */
export function selectPreviewSequence(sequences: readonly { name: string }[], unitId?: string): number {
  const property = unitId ? upgradeProperties[unitId] : undefined;
  const stands = sequences.map((sequence, index) => ({ index, words: Array.from(sequence.name.toLowerCase().match(/[a-z]+/g) || []) as string[] }))
    .filter(sequence => sequence.words[0] === 'stand');
  const suitable = stands.filter(sequence => property
    ? sequence.words.includes('upgrade') && sequence.words.includes(property)
    : !sequence.words.includes('upgrade'));
  const choices = suitable.length ? suitable : stands;
  choices.sort((a, b) => a.words.length - b.words.length);
  return choices[0]?.index ?? (sequences.length ? 0 : -1);
}
