import fs from 'fs-extra';
import path from 'path';

export interface CampaignMapMetadata {
    path: string;
    chapter?: string;
    title?: string;
}

export interface InstalledCampaignMetadata {
    title?: string;
    difficulty?: string;
    author?: string;
    description?: string;
    maps?: CampaignMapMetadata[];
}

interface StringToken {
    offset: number;
    raw: string;
    value: string;
}

const localeFolderByLanguage: Record<string, string> = {
    'zh-CN': 'zhCN.w3mod',
    'en-US': 'enUS.w3mod',
    'ko-KR': 'koKR.w3mod',
    'fr-FR': 'frFR.w3mod',
    'pt-BR': 'ptBR.w3mod',
    'ru-RU': 'ruRU.w3mod',
    'es-ES': 'esES.w3mod'
};

function readInt(buffer: Buffer, state: { offset: number }): number {
    const value = buffer.readInt32LE(state.offset);
    state.offset += 4;
    return value;
}

function readString(buffer: Buffer, state: { offset: number }): string {
    const start = state.offset;
    while (state.offset < buffer.length && buffer[state.offset] !== 0) {
        state.offset += 1;
    }
    const value = buffer.subarray(start, state.offset).toString('utf8');
    state.offset += 1;
    return value;
}

function normalizeWar3Text(value: string): string {
    return value
        .replace(/\|c[0-9a-fA-F]{8}/g, '')
        .replace(/\|r/g, '')
        .replace(/\|n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .trim();
}

function parseWts(content: string): Record<number, string> {
    const result: Record<number, string> = {};
    const re = /STRING\s+(\d+)[^\n\r]*[\r\n]+\s*\{([\s\S]*?)\}/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content))) {
        result[Number(match[1])] = normalizeWar3Text(match[2]);
    }
    return result;
}

async function readWtsTable(campaignPath: string, language?: string): Promise<Record<number, string>> {
    const tables: Record<number, string>[] = [];
    const rootWts = path.join(campaignPath, 'war3campaign.wts');
    if (await fs.pathExists(rootWts)) {
        tables.push(parseWts(await fs.readFile(rootWts, 'utf8')));
    }

    const localeFolder = language ? localeFolderByLanguage[language] : undefined;
    const localeWts = localeFolder ? path.join(campaignPath, '_Locales', localeFolder, 'war3campaign.wts') : undefined;
    if (localeWts && await fs.pathExists(localeWts)) {
        tables.push(parseWts(await fs.readFile(localeWts, 'utf8')));
    }

    return Object.assign({}, ...tables);
}

function resolveText(value: string, wts: Record<number, string>): string {
    const match = /^TRIGSTR_(-?\d+)/i.exec(value.trim());
    if (!match) {
        return normalizeWar3Text(value);
    }
    const id = Number(match[1]);
    if (id < 0) return '';
    return normalizeWar3Text(wts[id] || value);
}

function extractStringTokens(buffer: Buffer, wts: Record<number, string>): StringToken[] {
    const tokens: StringToken[] = [];
    let offset = 0;
    while (offset < buffer.length) {
        const start = offset;
        while (offset < buffer.length && buffer[offset] !== 0) {
            offset += 1;
        }
        if (offset > start) {
            const raw = buffer.subarray(start, offset).toString('utf8');
            if (/^[\x09\x0a\x0d\x20-\x7e]+$/.test(raw) || /^TRIGSTR_/i.test(raw)) {
                tokens.push({ offset: start, raw, value: resolveText(raw, wts) });
            }
        }
        offset += 1;
    }
    return tokens;
}

function extractMapMetadata(tokens: StringToken[]): CampaignMapMetadata[] {
    const maps: CampaignMapMetadata[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < tokens.length; i += 1) {
        const raw = tokens[i].raw;
        if (!/\.(w3x|w3m)$/i.test(raw)) continue;
        const normalized = raw.replace(/\//g, '\\').toLowerCase();
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        const previousA = tokens[i - 2];
        const previousB = tokens[i - 1];
        const chapter = previousA && !/\.(w3x|w3m)$/i.test(previousA.raw) ? previousA.value : undefined;
        const title = previousB && !/\.(w3x|w3m)$/i.test(previousB.raw) ? previousB.value : undefined;
        maps.push({
            path: raw,
            chapter: chapter || undefined,
            title: title || undefined
        });
    }
    return maps;
}

function parseW3f(buffer: Buffer, wts: Record<number, string>): InstalledCampaignMetadata {
    const state = { offset: 0 };
    readInt(buffer, state);
    readInt(buffer, state);
    readInt(buffer, state);
    const title = resolveText(readString(buffer, state), wts);
    const difficulty = resolveText(readString(buffer, state), wts);
    const author = resolveText(readString(buffer, state), wts);
    const description = resolveText(readString(buffer, state), wts);

    const tokens = extractStringTokens(buffer, wts);
    return {
        title,
        difficulty,
        author,
        description,
        maps: extractMapMetadata(tokens)
    };
}

export async function readInstalledCampaignMetadata(campaignPath: string, language?: string): Promise<InstalledCampaignMetadata> {
    const w3fPath = path.join(campaignPath, 'war3campaign.w3f');
    if (!(await fs.pathExists(w3fPath))) return {};

    try {
        const wts = await readWtsTable(campaignPath, language);
        const parsed = parseW3f(await fs.readFile(w3fPath), wts);
        return {
            title: parsed.title,
            difficulty: parsed.difficulty,
            author: parsed.author,
            description: parsed.description,
            maps: parsed.maps
        };
    } catch (error) {
        console.warn('[Campaign] Failed to parse campaign metadata:', campaignPath, error);
        return {};
    }
}
