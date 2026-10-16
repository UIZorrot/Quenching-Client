export interface CombinedClientUpdate {
  currentVersion: string;
  targetVersion: string;
  automatic: boolean;
}

export interface CombinedModUpdate {
  currentVersion: string | null;
  targetVersion: string;
  automatic: boolean;
  decision: 'patch' | 'requiresFullPackage' | 'unknownInstallation';
}

export interface CombinedUpdatePrompt {
  client: CombinedClientUpdate | null;
  mod: CombinedModUpdate | null;
  signature: string;
}

/** Build one stable prompt from the independently fetched client and MOD states. */
export function buildCombinedUpdatePrompt(
  clientStatus: {
    decision: 'available' | 'upToDate' | 'blocked' | 'unavailable' | 'incompatible';
    currentVersion: string;
  } | null,
  clientTargetVersion: string,
  modStatus: {
    decision: 'upToDate' | 'patch' | 'requiresFullPackage' | 'unknownInstallation' | 'unavailable';
    current: { version: string; displayVersion?: string } | null;
    target: { version: string; displayVersion: string } | null;
  } | null,
): CombinedUpdatePrompt | null {
  const client = clientStatus && clientTargetVersion
    ? {
        currentVersion: clientStatus.currentVersion,
        targetVersion: clientTargetVersion,
        automatic: clientStatus.decision === 'available',
      }
    : null;
  const modDecision = modStatus?.decision;
  // First installation belongs to the installation flow, not an update prompt.
  const mod = modStatus?.current && modStatus.target &&
      (modDecision === 'patch' || modDecision === 'requiresFullPackage' || modDecision === 'unknownInstallation')
    ? {
        currentVersion: modStatus.current
          ? (modStatus.current.displayVersion || modStatus.current.version)
          : null,
        targetVersion: modStatus.target.displayVersion || modStatus.target.version,
        automatic: modDecision === 'patch',
        decision: modDecision,
      }
    : null;
  if (!client && !mod) return null;
  return {
    client,
    mod,
    signature: JSON.stringify({ client, mod }),
  };
}
