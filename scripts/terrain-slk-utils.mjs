export function prepareTerrainSlkContent(content, prefix) {
    let rewritten = content.replace(/\r\r\n/g, '\r\n');
    rewritten = rewritten.replace(
        /C;X3;K"TerrainArt\\(?:terrain-que\\)?([^"\\]+)"/g,
        (_match, terrainName) => `C;X3;K"${prefix}\\${terrainName.toLowerCase()}"`
    );
    rewritten = rewritten.replace(
        /C;X3;K"t\d+\\([^"]+)"/g,
        (_match, folder) => `C;X3;K"${prefix}\\${folder.toLowerCase()}"`
    );
    return rewritten;
}

export function auditTerrainSlk(content) {
    const terrainArt = (content.match(/TerrainArt\\/g) || []).length;
    const doubleCr = (content.match(/\r\r\n/g) || []).length;
    return { terrainArt, doubleCr, bytes: Buffer.byteLength(content, 'latin1') };
}

/** Resolve SYLK's implicit coordinates before comparing records by ID/field. */
export function readSlkTable(content) {
    const cells = new Map();
    let x = 0;
    let y = 0;
    for (const line of content.split(/\r?\n/)) {
        if (!/^[CF];/.test(line)) continue;
        const column = line.match(/(?:^|;)X(\d+)/);
        const row = line.match(/(?:^|;)Y(\d+)/);
        if (column) x = Number(column[1]);
        if (row) y = Number(row[1]);
        if (!line.startsWith('C;')) continue;
        const value = line.match(/(?:^|;)K(?:"((?:[^"]|"")*)"|([^;]*))/);
        if (!value) continue;
        if (!cells.has(y)) cells.set(y, new Map());
        cells.get(y).set(x, (value[1] ?? value[2]).replace(/""/g, '"'));
    }
    const headers = cells.get(1);
    if (!headers?.get(1)) throw new Error('SLK has no ID column');
    const rows = new Map();
    const rowIds = new Map();
    for (const [number, values] of cells) {
        if (number < 2) continue;
        const id = values.get(1);
        if (!id) continue;
        if (rows.has(id)) throw new Error(`Duplicate SLK record: ${id}`);
        rows.set(id, new Map([...headers].map(([column, field]) => [field, values.get(column)])));
        rowIds.set(number, id);
    }
    return { headers, rows, rowIds };
}

/** Patch selected cells in the native table; all other records/bytes survive. */
export function patchSlkCells(content, updates) {
    const table = readSlkTable(content);
    let x = 0;
    let y = 0;
    return content.split(/\r?\n/).map(line => {
        if (!/^[CF];/.test(line)) return line;
        const column = line.match(/(?:^|;)X(\d+)/);
        const row = line.match(/(?:^|;)Y(\d+)/);
        if (column) x = Number(column[1]);
        if (row) y = Number(row[1]);
        if (!line.startsWith('C;') || y === 1) return line;
        const fields = updates.get(table.rowIds.get(y));
        const field = table.headers.get(x);
        if (!fields?.has(field)) return line;
        const value = fields.get(field);
        const encoded = typeof value === 'number' ? String(value) : `"${value.replace(/"/g, '""')}"`;
        return line.replace(/(;K)(?:"(?:[^"]|"")*"|[^;]*)/, (_match, prefix) => prefix + encoded);
    }).join('\r\n');
}
