/**
 * һ���Խű����ѵ�����ͼ���뵽ħ�� _retail_/t00|t16|t18|t20
 * ��������ʱ���ٴ�����ͼ��ֻά�� terrainart ��� slk��
 *
 * �÷�: node scripts/prepare-terrain-assets.mjs
 */
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REFERENCE_DIR =
    process.env.TERRAIN_REFERENCE ??
    'C:/Users/uizor/Desktop/war3.w3mod/_hd.w3mod/terrainart';
const RETAIL_DIR =
    process.env.WAR3_RETAIL ??
    'D:/Quenching/War3Reforged/Warcraft III/_retail_';

const VERSIONS = ['t00', 't16', 't18', 't20'];
const TEXTURE_SUFFIXES = ['diffuse', 'normal', 'orm'];

function findSubdirCaseInsensitive(parentDir, name) {
    if (!fs.existsSync(parentDir)) return null;
    const match = fs.readdirSync(parentDir).find((e) => e.toLowerCase() === name.toLowerCase());
    return match ? path.join(parentDir, match) : null;
}

function collectTextureBaseNames(files) {
    const bases = new Set();
    for (const file of files) {
        const match = file.match(/^(.+)_(diffuse|normal|orm)\.dds$/i);
        if (match) bases.add(match[1].toLowerCase());
    }
    return bases;
}

function listDdsFiles(dir) {
    const map = new Map();
    if (!fs.existsSync(dir)) return map;
    for (const file of fs.readdirSync(dir)) {
        if (/\.dds$/i.test(file)) map.set(file.toLowerCase(), file);
    }
    return map;
}

function copyTripletMaps(srcDir, destDir, baseNames) {
    let copied = 0;
    const srcFiles = listDdsFiles(srcDir);
    fs.ensureDirSync(destDir);

    for (const baseLower of baseNames) {
        for (const suffix of TEXTURE_SUFFIXES) {
            const key = `${baseLower}_${suffix}.dds`;
            const actualName = srcFiles.get(key);
            if (!actualName) continue;

            const destPath = path.join(destDir, actualName);
            if (!fs.existsSync(destPath)) {
                fs.copyFileSync(path.join(srcDir, actualName), destPath);
                copied += 1;
            }
        }
    }
    return copied;
}

function buildVersion(versionFolder, refTerrainNames) {
    const destVersionPath = path.join(RETAIL_DIR, versionFolder);
    fs.ensureDirSync(destVersionPath);

    const useReferenceOnly = versionFolder === 't20';
    let dirsCreated = 0;
    let mapsCopied = 0;

    for (const terrainName of refTerrainNames) {
        const refTerrainPath = path.join(REFERENCE_DIR, terrainName);
        const destTerrainPath =
            findSubdirCaseInsensitive(destVersionPath, terrainName) ??
            path.join(destVersionPath, terrainName);

        const retailTerrainPath = useReferenceOnly
            ? null
            : findSubdirCaseInsensitive(destVersionPath, terrainName);

        const refFiles = fs.readdirSync(refTerrainPath);
        const baseNames = collectTextureBaseNames(refFiles);

        if (!fs.existsSync(destTerrainPath)) {
            if (retailTerrainPath && fs.existsSync(retailTerrainPath)) {
                fs.copySync(retailTerrainPath, destTerrainPath);
            } else if (useReferenceOnly || !retailTerrainPath) {
                fs.copySync(refTerrainPath, destTerrainPath);
                dirsCreated += 1;
            } else {
                fs.ensureDirSync(destTerrainPath);
            }
        }

        if (retailTerrainPath && fs.existsSync(retailTerrainPath) && retailTerrainPath !== destTerrainPath) {
            mapsCopied += copyTripletMaps(retailTerrainPath, destTerrainPath, baseNames);
        }
        mapsCopied += copyTripletMaps(refTerrainPath, destTerrainPath, baseNames);
    }

    console.log(`[${versionFolder}] dirs+=${dirsCreated}, maps copied=${mapsCopied}`);
}

async function main() {
    if (!(await fs.pathExists(REFERENCE_DIR))) {
        throw new Error(`HD reference not found: ${REFERENCE_DIR}`);
    }
    if (!(await fs.pathExists(RETAIL_DIR))) {
        throw new Error(`War3 retail dir not found: ${RETAIL_DIR}`);
    }

    const refTerrainNames = (await fs.readdir(REFERENCE_DIR)).filter((name) =>
        fs.statSync(path.join(REFERENCE_DIR, name)).isDirectory()
    );

    console.log(`Reference terrains: ${refTerrainNames.length}`);
    console.log(`Target: ${RETAIL_DIR}`);

    for (const version of VERSIONS) {
        buildVersion(version, refTerrainNames);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
