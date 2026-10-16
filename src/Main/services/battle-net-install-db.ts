// Read only ProductInstall UID and UserSettings.install_path from Agent product.db.
// Wire layout reference: galaxy_blizzard_plugin/src/product_db.proto.
// No login/session data, cached decryption keys, or remote requests are used.
function fields(buffer: Buffer): Array<{ id: number; value: Buffer }> {
    const result: Array<{ id: number; value: Buffer }> = [];
    let cursor = 0;
    const varint = (): number => {
        let n = 0;
        for (let shift = 0; shift < 35; shift += 7) {
            if (cursor >= buffer.length) throw new Error('truncated install database');
            const byte = buffer[cursor++];
            n += (byte & 127) * 2 ** shift;
            if (!(byte & 128)) return n;
        }
        throw new Error('invalid install database integer');
    };
    while (cursor < buffer.length) {
        const tag = varint(), wire = tag % 8, id = Math.floor(tag / 8);
        if (!id) throw new Error('invalid install database field');
        if (wire === 2) {
            const length = varint(), end = cursor + length;
            if (end > buffer.length) throw new Error('truncated install database field');
            result.push({ id, value: buffer.subarray(cursor, end) }); cursor = end;
        } else if (wire === 0) {
            while (cursor < buffer.length && buffer[cursor++] & 128) { /* Skip unrelated numeric values. */ }
        } else if (wire === 1 || wire === 5) {
            cursor += wire === 1 ? 8 : 4;
            if (cursor > buffer.length) throw new Error('truncated install database value');
        } else throw new Error('unsupported install database field');
    }
    return result;
}

export function readBattleNetInstallPath(buffer: Buffer, product: 'w3' | 'w3t'): string | null {
    try {
        for (const entry of fields(buffer).filter(field => field.id === 1)) {
            const record = fields(entry.value);
            const uid = record.find(field => field.id === 1)?.value.toString('utf8').toLowerCase();
            const code = record.find(field => field.id === 2)?.value.toString('utf8').toLowerCase();
            // PTR can share a product_code with Retail; its UID still identifies w3t.
            if ((uid || code) !== product) continue;
            const settings = record.find(field => field.id === 3)?.value;
            const location = settings && fields(settings).find(field => field.id === 1)?.value.toString('utf8');
            return location?.trim() || null;
        }
    } catch { /* Missing/unsupported metadata falls back to the existing launch route. */ }
    return null;
}
