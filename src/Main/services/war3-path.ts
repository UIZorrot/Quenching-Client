import path from 'path';

/**
 * Convert paths users commonly select inside a Warcraft III installation back
 * to the installation root. All callers store the root and append `_retail_`
 * themselves, so persisting `_retail_` would create `_retail_/_retail_`.
 */
export function normalizeWar3RootPath(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) {
        return '';
    }

    let normalized = path.normalize(trimmed);

    if (path.basename(normalized).toLowerCase() === 'warcraft iii.exe') {
        normalized = path.dirname(normalized);
    } else if (path.extname(normalized).toLowerCase() === '.app') {
        normalized = path.dirname(normalized);
    }

    if (
        path.basename(normalized).toLowerCase() === 'x86_64' &&
        ['_retail_', '_ptr_'].includes(path.basename(path.dirname(normalized)).toLowerCase())
    ) {
        normalized = path.dirname(normalized);
    }

    while (['_retail_', '_ptr_'].includes(path.basename(normalized).toLowerCase())) {
        const parent = path.dirname(normalized);
        if (parent === normalized) {
            break;
        }
        normalized = parent;
    }

    return normalized;
}
