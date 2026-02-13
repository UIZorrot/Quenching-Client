import { ipcMain } from 'electron';
import fs from 'fs-extra';
import path from 'path';

/**
 * Classic Mode Skin Handler
 * Handles skin changes for classic mode by modifying unitskin.txt using INI parsing
 */

interface ClassicSkinChange {
    heroId: string;
    skinData: {
        file?: string;          // Model file path
        modelScale?: string;    // HD model scale
        art?: string;           // Icon path
        unitSound?: string;     // Sound set
    };
}

/**
 * Parse unitskin.txt and find the section for a given hero ID
 * Returns the start and end line indices of the section
 */
function findHeroSection(lines: string[], heroId: string): { start: number; end: number } | null {
    const sectionHeader = `[${heroId}]`;
    let start = -1;
    let end = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === sectionHeader) {
            start = i;
            // Find the end of this section (next section or end of file)
            for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].trim().startsWith('[') && lines[j].trim().endsWith(']')) {
                    end = j - 1;
                    break;
                }
            }
            if (end === -1) {
                end = lines.length - 1;
            }
            break;
        }
    }

    if (start === -1) {
        return null;
    }

    return { start, end };
}

/**
 * Find and update a field within a section
 * Returns true if field was found and updated, false otherwise
 */
function updateFieldInSection(
    lines: string[],
    sectionStart: number,
    sectionEnd: number,
    fieldName: string,
    value: string
): boolean {
    const fieldPrefix = `${fieldName}=`;

    for (let i = sectionStart; i <= sectionEnd; i++) {
        const line = lines[i].trim();
        if (line.startsWith(fieldPrefix)) {
            lines[i] = `${fieldName}=${value}`;
            return true;
        }
    }

    // Field not found, add it before the section end
    lines.splice(sectionEnd, 0, `${fieldName}=${value}`);
    return false;
}

export function registerClassicSkinHandlers() {
    /**
     * Apply skin in classic mode
     * Modifies specific fields in unitskin.txt based on hero ID using INI parsing
     */
    ipcMain.handle('classic-skin:apply', async (event, war3Path: string, change: ClassicSkinChange) => {
        console.log('[ClassicSkin] Applying skin:', change);

        const unitskinPath = path.join(war3Path, '_retail_', 'units', 'unitskin.txt');

        // Ensure units folder exists
        const unitsDir = path.dirname(unitskinPath);
        await fs.ensureDir(unitsDir);

        // Ensure unitskin.txt exists
        if (!(await fs.pathExists(unitskinPath))) {
            throw new Error('unitskin.txt not found. Please enable classic mode first.');
        }

        try {
            // Read all lines
            const content = await fs.readFile(unitskinPath, 'utf-8');
            const lines = content.split(/\r?\n/);

            // Find the hero section
            const section = findHeroSection(lines, change.heroId);
            if (!section) {
                throw new Error(`Hero section [${change.heroId}] not found in unitskin.txt`);
            }

            console.log(`[ClassicSkin] Found section for ${change.heroId} at lines ${section.start}-${section.end}`);

            // Update fields
            if (change.skinData.file !== undefined) {
                updateFieldInSection(lines, section.start, section.end, 'file', change.skinData.file);
            }

            if (change.skinData.modelScale !== undefined) {
                updateFieldInSection(lines, section.start, section.end, 'modelScale:hd', change.skinData.modelScale);
            }

            if (change.skinData.art !== undefined) {
                updateFieldInSection(lines, section.start, section.end, 'Art', change.skinData.art);
            }

            if (change.skinData.unitSound !== undefined) {
                updateFieldInSection(lines, section.start, section.end, 'unitSound', change.skinData.unitSound);
            }

            // Write back
            await fs.writeFile(unitskinPath, lines.join('\r\n'), 'utf-8');

            console.log(`[ClassicSkin] Successfully applied skin for ${change.heroId}`);
            return { success: true };

        } catch (error) {
            console.error('[ClassicSkin] Failed to apply skin:', error);
            throw error;
        }
    });

    /**
     * Get list of heroes supported in classic mode
     * Reads unitskin.txt and returns all section headers
     */
    ipcMain.handle('classic-skin:get-supported-heroes', async (event, war3Path: string) => {
        const unitskinPath = path.join(war3Path, '_retail_', 'units', 'unitskin.txt');

        if (!(await fs.pathExists(unitskinPath))) {
            return [];
        }

        try {
            const content = await fs.readFile(unitskinPath, 'utf-8');
            const lines = content.split(/\r?\n/);
            const heroes: string[] = [];

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                    const heroId = trimmed.substring(1, trimmed.length - 1);
                    // Only include hero IDs (4 characters starting with capital letter)
                    if (heroId.length === 4 && /^[A-Z]/.test(heroId)) {
                        heroes.push(heroId);
                    }
                }
            }

            return heroes;
        } catch (error) {
            console.error('[ClassicSkin] Failed to get supported heroes:', error);
            return [];
        }
    });
}
