import fs from 'fs-extra';

import path from 'path';

import { configManager } from './config-manager';

import { skinService } from './skin-service';

import { AssetSyncService } from './asset-sync';
import { assertFullPackageInstalled } from './full-package-service';



export interface RetroSkinStatus {

  unitsEnabled: boolean;

  buildingsEnabled: boolean;

  unitsDirName: string | null;

  buildingsDirName: string | null;

  unitskinExists: boolean;

}



type SectionCategory = 'units' | 'buildings' | 'unknown';



interface SkinSection {

  id: string;

  lines: string[];

  category: SectionCategory;

}



const UNIT_DIR_CANDIDATES = ['RUnits', 'Runits'] as const;

const BUILDING_DIR_CANDIDATES = ['Rbuildings'] as const;



export class RetroSkinService {

  private async getRetailDir(): Promise<string> {

    const war3Path = configManager.get('war3Path');

    if (!war3Path) {

      throw new Error('Warcraft III path not configured');

    }



    const retailPath = path.join(war3Path, '_retail_');

    return (await fs.pathExists(retailPath)) ? retailPath : war3Path;

  }



  async resolveRetroDirNames(baseDir: string): Promise<{ unitsDirName: string | null; buildingsDirName: string | null }> {

    let unitsDirName: string | null = null;

    let buildingsDirName: string | null = null;



    for (const name of UNIT_DIR_CANDIDATES) {

      if (await fs.pathExists(path.join(baseDir, name))) {

        unitsDirName = name;

        break;

      }

    }



    for (const name of BUILDING_DIR_CANDIDATES) {

      if (await fs.pathExists(path.join(baseDir, name))) {

        buildingsDirName = name;

        break;

      }

    }



    return { unitsDirName, buildingsDirName };

  }



  private classifySection(lines: string[]): SectionCategory {

    let category: SectionCategory = 'unknown';



    for (const line of lines) {

      const trimmed = line.trim();

      if (/^file=war3\.w3mod:units\\/i.test(trimmed) || /^file=units\\/i.test(trimmed)) {

        return 'units';

      }

      if (/^file=war3\.w3mod:buildings\\/i.test(trimmed) || /^file=buildings\\/i.test(trimmed)) {

        return 'buildings';

      }

      if (/^buildingShadow=/i.test(trimmed) && category === 'unknown') {

        category = 'buildings';

      }

    }



    return category;

  }



  private parseSections(content: string): SkinSection[] {

    const lines = content.split(/\r?\n/);

    const sections: SkinSection[] = [];

    let current: SkinSection | null = null;



    for (const line of lines) {

      const trimmed = line.trim();

      if (trimmed.startsWith('[') && trimmed.endsWith(']') && trimmed.length > 2) {

        if (current) {

          current.category = this.classifySection(current.lines);

          sections.push(current);

        }

        current = {

          id: trimmed.slice(1, -1),

          lines: [line],

          category: 'unknown',

        };

      } else if (current) {

        current.lines.push(line);

      }

    }



    if (current) {

      current.category = this.classifySection(current.lines);

      sections.push(current);

    }



    return sections;

  }



  private sectionsToMap(sections: SkinSection[]): Map<string, SkinSection> {

    return new Map(sections.map((section) => [section.id, section]));

  }



  private shouldUseRetroSection(category: SectionCategory, unitsEnabled: boolean, buildingsEnabled: boolean): boolean {

    if (category === 'units') {

      return unitsEnabled;

    }

    if (category === 'buildings') {

      return buildingsEnabled;

    }

    return unitsEnabled;

  }



  private transformSectionLines(

    lines: string[],

    unitsDirName: string | null,

    buildingsDirName: string | null

  ): string[] {

    return lines.map((line) => {

      const unitMatch = line.match(/^(file=)war3\.w3mod:units\\(.+)$/i);

      if (unitMatch && unitsDirName) {

        return `${unitMatch[1]}${unitsDirName}\\${unitMatch[2]}`;

      }



      const buildingMatch = line.match(/^(file=)war3\.w3mod:buildings\\(.+)$/i);

      if (buildingMatch && buildingsDirName) {

        return `${buildingMatch[1]}${buildingsDirName}\\${buildingMatch[2]}`;

      }



      return line;

    });

  }



  private async readAssetTemplate(fileName: string): Promise<string> {

    const assetsDir = await AssetSyncService.getAssetsDir();

    const templatePath = path.join(assetsDir, 'quenching', fileName);



    if (!(await fs.pathExists(templatePath))) {

      throw new Error(`Skin template not found: ${templatePath}`);

    }



    return fs.readFile(templatePath, 'utf-8');

  }



  private buildMergedUnitskinContent(

    normalSections: SkinSection[],

    retroSections: SkinSection[],

    unitsEnabled: boolean,

    buildingsEnabled: boolean,

    unitsDirName: string | null,

    buildingsDirName: string | null

  ): string {

    const normalMap = this.sectionsToMap(normalSections);

    const retroMap = this.sectionsToMap(retroSections);

    const outputLines: string[] = [];



    for (const section of normalSections) {

      const category = section.category;

      const useRetro = this.shouldUseRetroSection(category, unitsEnabled, buildingsEnabled);



      let sectionLines: string[];

      if (useRetro && retroMap.has(section.id)) {

        sectionLines = this.transformSectionLines(

          retroMap.get(section.id)!.lines,

          unitsEnabled ? unitsDirName : null,

          buildingsEnabled ? buildingsDirName : null

        );

      } else {

        sectionLines = (normalMap.get(section.id) ?? section).lines;

      }



      if (outputLines.length > 0) {

        outputLines.push('');

      }

      outputLines.push(...sectionLines);

    }



    return outputLines.join('\r\n');

  }



  async getStatus(): Promise<RetroSkinStatus> {

    const baseDir = await this.getRetailDir();

    const { unitsDirName, buildingsDirName } = await this.resolveRetroDirNames(baseDir);

    const unitskinPath = path.join(baseDir, 'units', 'unitskin.txt');



    return {

      unitsEnabled: configManager.get('retroSkinUnits') ?? false,

      buildingsEnabled: configManager.get('retroSkinBuildings') ?? false,

      unitsDirName,

      buildingsDirName,

      unitskinExists: await fs.pathExists(unitskinPath),

    };

  }



  async apply(options: { unitsEnabled?: boolean; buildingsEnabled?: boolean }): Promise<RetroSkinStatus> {

    const baseDir = await this.getRetailDir();

    const unitsEnabled = options.unitsEnabled ?? configManager.get('retroSkinUnits') ?? false;

    const buildingsEnabled = options.buildingsEnabled ?? configManager.get('retroSkinBuildings') ?? false;

    if (unitsEnabled || buildingsEnabled) {
      await assertFullPackageInstalled(configManager.get('war3Path'));
    }



    configManager.set('retroSkinUnits', unitsEnabled);

    configManager.set('retroSkinBuildings', buildingsEnabled);



    const unitskinPath = path.join(baseDir, 'units', 'unitskin.txt');

    const disabledPath = path.join(baseDir, 'units', 'unitskin-dis.txt');



    if (!unitsEnabled && !buildingsEnabled) {

      if (await fs.pathExists(unitskinPath)) {

        await fs.remove(unitskinPath);

      }

      console.log('[RetroSkinService] Both retro toggles off, restoring normal unitskin.txt');

      await skinService.enableSkins();

      return this.getStatus();

    }



    const { unitsDirName, buildingsDirName } = await this.resolveRetroDirNames(baseDir);



    if (unitsEnabled && !unitsDirName) {

      throw new Error('RUnits/Runits directory not found in game installation');

    }

    if (buildingsEnabled && !buildingsDirName) {

      throw new Error('Rbuildings directory not found in game installation');

    }



    const normalTemplate = await this.readAssetTemplate('unitskin-new.txt');

    const retroTemplate = await this.readAssetTemplate('unitskin-old.txt');

    const normalSections = this.parseSections(normalTemplate);

    const retroSections = this.parseSections(retroTemplate);



    const mergedContent = this.buildMergedUnitskinContent(

      normalSections,

      retroSections,

      unitsEnabled,

      buildingsEnabled,

      unitsDirName,

      buildingsDirName

    );



    await fs.ensureDir(path.dirname(unitskinPath));



    if (await fs.pathExists(disabledPath)) {

      await fs.remove(disabledPath);

    }



    await fs.writeFile(unitskinPath, mergedContent, 'utf-8');

    console.log(

      `[RetroSkinService] Wrote merged unitskin.txt (retro units=${unitsEnabled}, retro buildings=${buildingsEnabled})`

    );



    return this.getStatus();

  }

}



export const retroSkinService = new RetroSkinService();


