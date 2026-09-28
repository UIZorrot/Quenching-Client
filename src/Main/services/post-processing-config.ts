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
