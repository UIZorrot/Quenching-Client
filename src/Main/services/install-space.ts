import { statfs } from 'fs/promises';
import path from 'path';
import { configManager } from './config-manager';
export { getZipUncompressedBytes } from './zip-extraction';

const GIB = 1024 ** 3;
const SAFETY_BYTES = 512 * 1024 ** 2;
const UNKNOWN_PACKAGE_WARNING_BYTES = 10 * GIB;

export interface InstallSpaceStatus {
    freeBytes: number;
    requiredBytes: number;
    insufficient: boolean;
    estimate: boolean;
}

export async function getInstallSpaceStatus(gameRoot: string, packageBytes?: number): Promise<InstallSpaceStatus> {
    const stats = await statfs(path.resolve(gameRoot));
    const freeBytes = Number(stats.bavail) * Number(stats.bsize);
    const rememberedBytes = configManager.get('lastFullPackageBytes');
    const estimate = packageBytes === undefined && rememberedBytes <= 0;
    const requiredBytes = packageBytes !== undefined
        ? packageBytes + SAFETY_BYTES
        : rememberedBytes > 0 ? rememberedBytes + SAFETY_BYTES : UNKNOWN_PACKAGE_WARNING_BYTES;
    return { freeBytes, requiredBytes, insufficient: freeBytes < requiredBytes, estimate };
}

