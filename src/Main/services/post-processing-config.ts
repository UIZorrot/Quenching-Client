import fs from 'fs-extra';
import path from 'path';

export const POST_PROCESSING_CONFIG_FILE = 'PostProcessingConfig.txt';

/** Copy the bundled config only when the branch does not already have one. */
export async function copyPostProcessingConfigIfMissing(buildDir: string, sourceFile: string): Promise<boolean> {
  const target = path.join(buildDir, POST_PROCESSING_CONFIG_FILE);
  try {
    await fs.copyFile(sourceFile, target, fs.constants.COPYFILE_EXCL);
    return true;
  } catch (error: any) {
    if (error?.code === 'EEXIST') return false;
    throw error;
  }
}

/** Set [ASSAO] Enabled in the branch config. Returns false when the file is absent or already matches. */
export async function setPostProcessingAoEnabled(buildDir: string, enabled: boolean): Promise<boolean> {
  const target = path.join(buildDir, POST_PROCESSING_CONFIG_FILE);
  const content = await fs.readFile(target, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (content === null) return false;
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const value = `Enabled=${enabled ? 1 : 0}`;
  const header = lines.findIndex(line => line.trim().toLowerCase() === '[assao]');
  if (header === -1) {
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    lines.push('', '[ASSAO]', value);
  } else {
    let end = lines.findIndex((line, i) => i > header && line.trim().startsWith('['));
    if (end === -1) end = lines.length;
    const existing = lines.findIndex((line, i) => i > header && i < end && /^\s*enabled\s*=/i.test(line));
    if (existing === -1) lines.splice(header + 1, 0, value);
    else lines[existing] = value;
  }
  const next = lines.join(eol);
  if (next === content) return false;
  await fs.writeFile(target, next, 'utf8');
  return true;
}
