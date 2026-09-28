import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';

// Only loose Quenching override roots. Never touch x86_64, CASC data, or game metadata.
export const BRANCH_MOD_FOLDERS = [
  't00', 't16', 't18', 't20', 't30', 'd00', 'd16', 'd18', 'd20', 'd30',
  'RUnits', 'Rbuildings', 'RetroTex', 'cos', 'buildings',
  'campaign', 'doodads', 'env', 'environment', 'fonts', 'patch',
  'replaceabletextures', 'scripts', 'shaders', 'splats', 'terrainart',
  'textures', 'ui', 'units', 'water', 'webui',
] as const;

const STATE_RELATIVE = path.join('.quenching', 'branch-toggle.json');

type Phase = 'disabling' | 'disabled' | 'enabling' | 'enabled';
interface Move { active: string; parked: string }
interface State { schema: 1; phase: Phase; moves: Move[] }

function statePath(buildDir: string): string { return path.join(buildDir, STATE_RELATIVE); }
function absolute(buildDir: string, relative: string): string { return path.join(buildDir, ...relative.split('/')); }
async function existsNoFollow(file: string): Promise<boolean> {
  return !!(await fs.lstat(file).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  }));
}
async function assertSafeParents(buildDir: string, relative: string): Promise<void> {
  let current = buildDir;
  for (const part of relative.split('/').slice(0, -1)) {
    current = path.join(current, part);
    const stat = await fs.lstat(current).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error(`Unsafe MOD directory: ${current}`);
  }
}
function safeRelative(value: string): boolean {
  return !!value && !path.isAbsolute(value) && !value.includes('\\') &&
    !value.split('/').some((part) => !part || part === '.' || part === '..');
}

function validateState(value: any): State {
  if (value?.schema !== 1 || !['disabling', 'disabled', 'enabling', 'enabled'].includes(value.phase) || !Array.isArray(value.moves)) {
    throw new Error('Invalid branch toggle record; no files were moved');
  }
  const seen = new Set<string>();
  for (const move of value.moves) {
    if (!safeRelative(move?.active) || !safeRelative(move?.parked) ||
        !BRANCH_MOD_FOLDERS.includes(move.active.split('/')[0] as any) ||
        !move.parked.startsWith('QMoff/') || seen.has(move.active.toLowerCase())) {
      throw new Error('Unsafe branch toggle record; no files were moved');
    }
    seen.add(move.active.toLowerCase());
  }
  return value as State;
}

async function readState(buildDir: string): Promise<State | null> {
  const file = statePath(buildDir);
  if (!(await fs.pathExists(file))) return null;
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Invalid branch toggle record');
  return validateState(await fs.readJson(file));
}

async function writeState(buildDir: string, state: State): Promise<void> {
  validateState(state);
  const file = statePath(buildDir);
  await fs.ensureDir(path.dirname(file));
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(state), { flag: 'wx' });
  try { await fs.rename(temporary, file); }
  finally { await fs.remove(temporary).catch(() => undefined); }
}

async function enumerateActiveFiles(buildDir: string): Promise<string[]> {
  // The package manifest is the ownership boundary. Player-created files in
  // otherwise shared Warcraft directories must remain where they are.
  const keep = await fs.readFile(path.join(buildDir, '_patch', 'keep.que'), 'utf8').catch(() => '');
  const versions = [...keep.matchAll(/^-v(\d+(?:\.\d+){1,2})-\s*$/gim)];
  const version = versions.at(-1)?.[1];
  if (!version) throw new Error('No package version marker; refusing to move unowned files');
  const manifestFile = path.join(buildDir, '_patch', `qmf-${version}.files.json.gz`);
  const compressed = await fs.readFile(manifestFile).catch(() => null);
  if (!compressed) throw new Error('No package file list; refusing to move unowned files');
  const manifest = JSON.parse(zlib.gunzipSync(compressed).toString('utf8'));
  if (manifest?.schema !== 1 || manifest?.product !== 'quenching-mod' || manifest?.version !== version || !Array.isArray(manifest.files)) {
    throw new Error('Invalid package file list; refusing to move files');
  }
  const canonical = [...manifest.files].sort((a, b) => String(a?.path).localeCompare(String(b?.path)))
    .map((record) => `${record?.path}\0${record?.size}\0${String(record?.sha256).toLowerCase()}\n`).join('');
  if (manifest.filesDigest !== crypto.createHash('sha256').update(canonical).digest('hex')) {
    throw new Error('Package file list digest mismatch; refusing to move files');
  }
  const files: string[] = [];
  const seen = new Set<string>();
  for (const record of manifest.files) {
    const relative = record?.path;
    if (typeof relative !== 'string' || !safeRelative(relative) || !Number.isSafeInteger(record?.size) ||
        record.size < 0 || !/^[a-f0-9]{64}$/i.test(record?.sha256)) throw new Error('Unsafe package file list');
    if (!BRANCH_MOD_FOLDERS.includes(relative.split('/')[0] as any)) continue;
    const key = relative.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate package path: ${relative}`);
    seen.add(key);
    const full = absolute(buildDir, relative);
    await assertSafeParents(buildDir, relative);
    if (!(await existsNoFollow(full))) continue; // SD resources may already be in QMoff.
    const stat = await fs.lstat(full);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Unexpected package path: ${relative}`);
    files.push(relative);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

async function planDisable(buildDir: string): Promise<Move[]> {
  const moves: Move[] = [];
  for (const active of await enumerateActiveFiles(buildDir)) {
    const parked = `QMoff/${active}`;
    await assertSafeParents(buildDir, parked);
    moves.push({ active, parked });
  }
  return moves;
}

async function moveOne(from: string, to: string): Promise<void> {
  if (!(await existsNoFollow(from))) throw new Error(`MOD resource is missing: ${from}`);
  const stat = await fs.lstat(from);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Cannot move unexpected MOD path: ${from}`);
  await fs.ensureDir(path.dirname(to));
  if (await existsNoFollow(to)) await fs.remove(to);
  await fs.rename(from, to);
}

/** Reverse only moves that actually happened. */
async function rollBack(buildDir: string, state: State, moves: Move[] = state.moves): Promise<void> {
  const disabling = state.phase === 'disabling';
  for (const move of [...moves].reverse()) {
    const original = absolute(buildDir, disabling ? move.active : move.parked);
    const moved = absolute(buildDir, disabling ? move.parked : move.active);
    await assertSafeParents(buildDir, disabling ? move.active : move.parked);
    await assertSafeParents(buildDir, disabling ? move.parked : move.active);
    const [hasOriginal, hasMoved] = await Promise.all([existsNoFollow(original), existsNoFollow(moved)]);
    if (hasOriginal && !hasMoved) continue;
    if (!hasMoved) throw new Error(`Cannot safely roll back ${move.active}; neither copy exists`);
    await moveOne(moved, original);
  }
}

/** Called before synchronization/IPC. Recover only this new, exact file-level transaction. */
export async function recoverBranchModToggle(buildDir: string): Promise<boolean | null> {
  const state = await readState(buildDir);
  if (!state) return null;
  if (state.phase === 'disabling' || state.phase === 'enabling') {
    await rollBack(buildDir, state);
    if (state.phase === 'disabling') await fs.unlink(statePath(buildDir));
    else await writeState(buildDir, { ...state, phase: 'disabled' });
    return state.phase === 'disabling';
  }
  if (state.phase === 'enabled') {
    await fs.unlink(statePath(buildDir));
    return true;
  }
  return false;
}

export async function isBranchModDisabled(buildDir: string): Promise<boolean> {
  const state = await readState(buildDir);
  if (state && state.phase !== 'disabled') throw new Error('Branch toggle is incomplete; recover it before continuing');
  return state?.phase === 'disabled';
}

/** A basic-mode switch has no package ownership list, so it changes only the
 * branch preference. Full packages and already parked packages still use the
 * journaled file transition. */
export async function applyBranchModFilesForSwitch(buildDir: string, enabled: boolean, fullPackageInstalled: boolean): Promise<void> {
  if (fullPackageInstalled || await isBranchModDisabled(buildDir)) {
    await setBranchModEnabledOnDisk(buildDir, enabled);
  }
}

export async function setBranchModEnabledOnDisk(buildDir: string, enabled: boolean): Promise<void> {
  const existing = await readState(buildDir);
  if (existing && existing.phase !== 'disabled') throw new Error('Branch toggle is incomplete');
  if (enabled && !existing) {
    await enumerateActiveFiles(buildDir);
    return;
  }
  if (!enabled && existing) return;
  const state: State = enabled
    ? { ...existing!, phase: 'enabling' }
    : { schema: 1, phase: 'disabling', moves: await planDisable(buildDir) };
  for (const move of state.moves) {
    const from = absolute(buildDir, enabled ? move.parked : move.active);
    const to = absolute(buildDir, enabled ? move.active : move.parked);
    await assertSafeParents(buildDir, enabled ? move.parked : move.active);
    await assertSafeParents(buildDir, enabled ? move.active : move.parked);
    if (!(await existsNoFollow(from))) throw new Error(`MOD resource is missing: ${from}`);
  }
  await writeState(buildDir, state);
  const completed: Move[] = [];
  try {
    for (const move of state.moves) {
      const from = absolute(buildDir, enabled ? move.parked : move.active);
      const to = absolute(buildDir, enabled ? move.active : move.parked);
      await moveOne(from, to);
      completed.push(move);
    }
    if (enabled) {
      await writeState(buildDir, { ...state, phase: 'enabled' });
      await fs.unlink(statePath(buildDir));
    } else {
      await writeState(buildDir, { ...state, phase: 'disabled' });
    }
  } catch (error) {
    try {
      await rollBack(buildDir, state, completed);
      if (enabled) await writeState(buildDir, { ...state, phase: 'disabled' });
      else await fs.unlink(statePath(buildDir));
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'MOD toggle failed and needs safe recovery');
    }
    throw error;
  }
}
