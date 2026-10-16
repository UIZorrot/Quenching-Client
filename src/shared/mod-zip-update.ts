import { SyncArtifact, validateGithubMirrors, validateSyncArtifact } from './file-sync';

/** One immutable, ordinary ZIP for each successive official resource release. */
export interface ModZipPatch extends SyncArtifact {
  fromSequence: number;
  toSequence: number;
  fromVersion: string;
  version: string;
  displayVersion: string;
}
export interface ModZipPolicy {
  patches: ModZipPatch[];
  maxPatchSteps: number;
  githubMirrors: string[];
}
const VERSION = /^\d+(?:\.\d+){1,2}$/;

export function validateModZipPolicy(value: any): ModZipPolicy {
  const maxPatchSteps = value.maxPatchSteps ?? 6;
  if (!Number.isSafeInteger(maxPatchSteps) || maxPatchSteps < 1 || maxPatchSteps > 64 || !Array.isArray(value.patches)) {
    throw new Error('Invalid MOD ZIP patch policy');
  }
  const starts = new Set<number>();
  const patches = value.patches.map((patch: any): ModZipPatch => {
    const artifact = validateSyncArtifact(patch);
    if (artifact.sources.some(source => typeof source !== 'string') ||
        !Number.isSafeInteger(patch.fromSequence) || patch.fromSequence < 34 ||
        !Number.isSafeInteger(patch.toSequence) || patch.toSequence <= patch.fromSequence || patch.toSequence > value.sequence ||
        !VERSION.test(patch.fromVersion) || !VERSION.test(patch.version) || patch.fromVersion === patch.version ||
        (patch.displayVersion !== undefined && !VERSION.test(patch.displayVersion)) || starts.has(patch.fromSequence)) {
      throw new Error('Invalid or ambiguous successive MOD ZIP patch');
    }
    starts.add(patch.fromSequence);
    return { ...artifact, fromSequence: patch.fromSequence, toSequence: patch.toSequence,
      fromVersion: patch.fromVersion, version: patch.version, displayVersion: patch.displayVersion ?? patch.version };
  });
  return { patches, maxPatchSteps, githubMirrors: validateGithubMirrors(value.githubMirrors) };
}

/** Sequence is an identifier, not version arithmetic. Count actual ZIP steps. */
export function planModZipChain(current: { sequence: number; version: string },
  target: { sequence: number; version: string }, policy: ModZipPolicy): { patches: ModZipPatch[]; reason?: string } {
  const byStart = new Map(policy.patches.map(patch => [patch.fromSequence, patch]));
  const patches: ModZipPatch[] = [];
  let cursor = current;
  while (cursor.sequence < target.sequence) {
    const patch = byStart.get(cursor.sequence);
    if (!patch || patch.fromVersion !== cursor.version) return { patches: [], reason: 'no continuous ZIP patch chain is published for this MOD version' };
    patches.push(patch);
    if (patches.length > policy.maxPatchSteps) return { patches: [], reason: 'installed MOD is too old for the published ZIP patch policy' };
    cursor = { sequence: patch.toSequence, version: patch.version };
  }
  if (cursor.sequence !== target.sequence || cursor.version !== target.version) {
    return { patches: [], reason: 'ZIP patch chain does not end at the advertised MOD release' };
  }
  return { patches };
}
