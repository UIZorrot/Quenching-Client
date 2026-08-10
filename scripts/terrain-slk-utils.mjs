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
