/** Skin records stay keyed by case-sensitive game IDs, including Ytsc. */
export function readSkinTable(text) {
    const rows = new Map();
    let row;
    for (const line of text.split(/\r?\n/)) {
        const header = /^\[([^\]]+)\]/.exec(line.trim());
        if (header) {
            row = new Map();
            rows.set(header[1], row);
        } else if (row && !line.trim().startsWith('//')) {
            const equals = line.indexOf('=');
            if (equals > 0) row.set(line.slice(0, equals).trim(), line.slice(equals + 1).trim());
        }
    }
    return rows;
}

const normalized = value => value?.replace(/\\/g, '/').toLowerCase();

/** Refresh the baseline while retaining only the package's deliberate MOD paths. */
export function alignPackageDestructables(current, legacy, installed) {
    const original = readSkinTable(current);
    const previous = readSkinTable(legacy);
    const configured = readSkinTable(installed);
    const overrides = [];
    for (const [oldId, row] of configured) {
        const id = oldId === 'YTsc' && !original.has(oldId) && original.has('Ytsc') ? 'Ytsc' : oldId;
        const base = original.get(id);
        for (const [field, value] of row) {
            if (normalized(value) === normalized(base?.get(field)) ||
                normalized(value) === normalized(previous.get(oldId)?.get(field))) continue;
            const isModPath = /^(?:file|texFile)(?::(?:sd|hd|de))?$/.test(field) &&
                /^(?:doodads\/que\/|replaceabletextures\/tree\/)/i.test(normalized(value));
            const isHiddenPlatform = ['OTip', 'OTis'].includes(id) && field === 'file' && value === '.mdl';
            if (!base || (!isModPath && !isHiddenPlatform)) {
                throw new Error(`Unrecognized full-package skin override: ${oldId}.${field}=${value}`);
            }
            // Warcraft 3.0 moved some shared tree textures into the SD field.
            const targetField = field === 'texFile' && !base.has(field) && base.has('texFile:sd') ? 'texFile:sd' : field;
            overrides.push({ id, field: targetField, value });
        }
    }
    const lines = current.split(/\r?\n/);
    for (const { id, field, value } of overrides) {
        const start = lines.findIndex(line => line.trim() === `[${id}]`);
        if (start < 0) throw new Error(`Missing current skin record: ${id}`);
        let end = start + 1;
        while (end < lines.length && !/^\[/.test(lines[end].trim())) end++;
        const at = lines.findIndex((line, index) => index > start && index < end && line.split('=')[0].trim() === field);
        if (at >= 0) lines[at] = `${field}=${value}`;
        else lines.splice(end, 0, `${field}=${value}`);
    }
    return { content: lines.join('\r\n'), overrides, records: original.size };
}
