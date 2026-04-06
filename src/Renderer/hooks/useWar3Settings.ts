import { useState, useEffect } from 'react';
import { reaxel, createReaxable } from 'reaxes';

// War3设置接口
export interface War3Settings {
  hd: boolean;           // 重制版模式
  reswidth: number;      // 分辨率宽度
  resheight: number;     // 分辨率高度
  windowmode: number;    // 窗口模式 (0=全屏, 1=窗口, 2=无边框窗口)
  [key: string]: any;
}

// 相机设置接口
export interface CameraSettings {
  enabled: boolean;
  fieldOfView: number;   // 视野角度
  angleOfAttack: number; // 攻击角度
}

// MOD设置接口
export interface ModSettings {
  objectShader: boolean; // 物体着色器
  postProcessing: boolean; // 后处理
  volumetricFog: boolean; // 体积雾
  water: 'transparent' | 'realistic' | 'off'; // 水面效果
  foliage: boolean;      // 植被效果
  lighting: 'standard' | 'enhanced' | 'battle' | 'rpg'; // 光照效果
  half: boolean;         // 半透明效果
  ui: 'classic' | 'quenching' | 'carnival'; // UI风格
  cam: boolean;          // 自定义相机
  glow: boolean;         // 缩减光晕
  terrain: 'original' | 'latest' | 'retro' | 'v16' | 'v18'; // 地形
  tree: 'original' | 'tall' | 'short' | 'retro' | 'v16' | 'v18'; // 树木
  envRender: boolean;    // 环境渲染
  modelEnhance: boolean; // 模型加强
  visionModPath: string; // VisionMod目录
  modEnabled: boolean;   // MOD总开关
  classicMode: boolean;  // 经典版锁定
}

export interface War3SettingsState {
  settings: War3Settings;
  cameraSettings: CameraSettings;
  modSettings: ModSettings;
  isLoading: boolean;
}

// War3设置管理
export const reaxel_War3Settings = reaxel(() => {
  const { store, setState } = createReaxable<War3SettingsState>({
    settings: {} as War3Settings,
    cameraSettings: {
      enabled: false,
      fieldOfView: 70,
      angleOfAttack: 0
    } as CameraSettings,
    modSettings: {
      objectShader: true,
      postProcessing: true,
      volumetricFog: true,
      water: 'transparent' as const,
      foliage: true,
      lighting: 'standard' as const,
      half: false,
      ui: 'classic' as const,
      cam: false,
      glow: false,
      terrain: 'latest' as const,
      tree: 'tall' as const,
      envRender: true,
      modelEnhance: false,
      visionModPath: '',
      modEnabled: true
    } as ModSettings,
    isLoading: false
  });

  // 加载War3设置
  const loadSettings = async (war3Path: string) => {
    setState({ isLoading: true });

    try {
      // 读取War3Preferences.txt
      const docsPath = await window.electronAPI?.getAppPath('documents');
      const preferencesPath = `${docsPath}/Warcraft III/War3Preferences.txt`;
      const exists = await window.electronAPI?.pathExists(preferencesPath);

      if (exists) {
        const content = await window.electronAPI?.readFile(preferencesPath);
        const settings = parseWar3Preferences(content);
        setState({ settings });
      }

      // 加载MOD设置
      await loadModSettings(war3Path);

    } catch (error) {
      console.error('Failed to load War3 settings:', error);
    } finally {
      setState({ isLoading: false });
    }
  };

  // 解析War3Preferences.txt
  const parseWar3Preferences = (content: string): War3Settings => {
    const settings: War3Settings = {
      hd: false,
      reswidth: 1024,
      resheight: 768,
      windowmode: 0
    };

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.includes('=')) {
        const [key, value] = trimmedLine.split('=').map(s => s.trim());

        switch (key) {
          case 'hd':
            settings.hd = value === '1';
            break;
          case 'reswidth':
            settings.reswidth = parseInt(value) || 1024;
            break;
          case 'resheight':
            settings.resheight = parseInt(value) || 768;
            break;
          case 'windowmode':
            settings.windowmode = parseInt(value) || 0;
            break;
          default:
            settings[key] = value;
        }
      }
    }

    return settings;
  };

  /**
   * 基于目录是否存在检测环境渲染 (scripts/)
   */
  const detectEnvRenderMode = async (war3Path: string): Promise<boolean> => {
    try {
      const retailDir = `${war3Path}/_retail_`;
      const baseDir = (await window.electronAPI?.pathExists(retailDir)) ? retailDir : war3Path;
      const targetPath = `${baseDir}/scripts`;
      return await window.electronAPI?.pathExists(targetPath);
    } catch (e) {
      console.warn('[useWar3Settings] detectEnvRenderMode failed:', e);
      return store.modSettings.envRender;
    }
  };

  /**
   * 基于文件是否存在检测英雄光晕 (heroglow_bw.dds)
   */
  const detectGlowMode = async (war3Path: string): Promise<boolean> => {
    try {
      const retailDir = `${war3Path}/_retail_`;
      const baseDir = (await window.electronAPI?.pathExists(retailDir)) ? retailDir : war3Path;
      const targetPath = `${baseDir}/textures/fx/flare/heroglow_bw.dds`;
      return await window.electronAPI?.pathExists(targetPath);
    } catch (e) {
      console.warn('[useWar3Settings] detectGlowMode failed:', e);
      return store.modSettings.glow;
    }
  };

  // 保存War3设置
  const saveSettings = async (war3Path: string, newSettings: Partial<War3Settings>) => {
    try {
      const updatedSettings = { ...store.settings, ...newSettings };
      setState({ settings: updatedSettings });

      // 生成War3Preferences.txt内容
      const content = generateWar3Preferences(updatedSettings);

      // 写入文件
      const docsPath = await window.electronAPI?.getAppPath('documents');
      const preferencesPath = `${docsPath}/Warcraft III/War3Preferences.txt`;
      await window.electronAPI?.writeFile(preferencesPath, content);

    } catch (error) {
      console.error('Failed to save War3 settings:', error);
      throw error;
    }
  };

  // 生成War3Preferences.txt内容
  const generateWar3Preferences = (settings: War3Settings): string => {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'boolean') {
        lines.push(`${key}=${value ? '1' : '0'}`);
      } else {
        lines.push(`${key}=${value}`);
      }
    }

    return lines.join('\n');
  };

  // 切换游戏模式
  const toggleGameMode = async (war3Path: string, isReforged: boolean) => {
    await saveSettings(war3Path, { hd: isReforged });
  };

  // 设置分辨率
  const setResolution = async (war3Path: string, width: number, height: number) => {
    await saveSettings(war3Path, { reswidth: width, resheight: height });
  };

  // 加载MOD设置
  const loadModSettings = async (war3Path: string) => {
    console.log(`\n>>> [useWar3Settings] loadModSettings START for path: ${war3Path}`);
    try {
      let loadedSettings = { ...store.modSettings };

      if (window.electronAPI?.getConfig) {
        const stored = await window.electronAPI.getConfig('modSettings');
        console.log('[useWar3Settings] Stored modSettings from config:', stored);
        if (stored && typeof stored === 'object') {
          loadedSettings = { ...loadedSettings, ...stored };

          // 迁移: 如果是旧的 'enhanced' (淬火) 模式，自动切换回 'standard' (普通)
          if (loadedSettings.lighting === 'enhanced') {
            loadedSettings.lighting = 'standard';
          }
        }
      }

      console.log('[useWar3Settings] Starting file-based detection...');

      // 基于实际文件状态检测地形模式，高亮与真实状态一致
      const detectedTerrain = await detectTerrainMode(war3Path);
      console.log(`[useWar3Settings] Detected terrain: ${detectedTerrain}`);
      loadedSettings.terrain = detectedTerrain;

      // 检测树木模式
      const detectedTree = await detectTreeMode(war3Path);
      console.log(`[useWar3Settings] Detected tree: ${detectedTree}`);
      loadedSettings.tree = detectedTree;

      // 检测水面模式
      const detectedWater = await detectWaterMode(war3Path);
      console.log(`[useWar3Settings] Detected water: ${detectedWater}`);
      loadedSettings.water = detectedWater;

      // 检测植被模式
      const detectedFoliage = await detectFoliageMode(war3Path);
      console.log(`[useWar3Settings] Detected foliage: ${detectedFoliage}`);
      loadedSettings.foliage = detectedFoliage;

      // 检测物体着色器
      const detectedObjectShader = await detectObjectShaderMode(war3Path);
      console.log(`[useWar3Settings] Detected objectShader: ${detectedObjectShader}`);
      loadedSettings.objectShader = detectedObjectShader;

      // 检测后处理
      const detectedPostProcessing = await detectPostProcessingMode(war3Path);
      console.log(`[useWar3Settings] Detected postProcessing: ${detectedPostProcessing}`);
      loadedSettings.postProcessing = detectedPostProcessing;

      // 检测环境渲染
      const detectedEnvRender = await detectEnvRenderMode(war3Path);
      console.log(`[useWar3Settings] Detected envRender: ${detectedEnvRender}`);
      loadedSettings.envRender = detectedEnvRender;

      // 检测英雄光晕
      const detectedGlow = await detectGlowMode(war3Path);
      console.log(`[useWar3Settings] Detected glow: ${detectedGlow}`);
      loadedSettings.glow = detectedGlow;

      console.log('[useWar3Settings] Final merged settings to be set in store:', loadedSettings);
      setState({ modSettings: loadedSettings });

      await loadCameraSettings(war3Path);
      console.log('[useWar3Settings] loadModSettings COMPLETE\n');
    } catch (error) {
      console.error('[useWar3Settings] FATAL ERROR in loadModSettings:', error);
    }
  };

  /**
   * 基于文件内容检测树木模式
   */
  const detectTreeMode = async (war3Path: string): Promise<ModSettings['tree']> => {
    try {
      const retailDir = `${war3Path}/_retail_`;
      const baseDir = (await window.electronAPI?.pathExists(retailDir)) ? retailDir : war3Path;
      const targetPath = `${baseDir}/units/destructableskin.txt`;
      const exists = await window.electronAPI?.pathExists(targetPath);

      console.log(`[useWar3Settings] Detecting tree mode at: ${targetPath}, exists: ${exists}`);
      if (!exists) return 'original';

      // 读取文件内容进行关键词匹配
      // @ts-ignore
      const content = await window.electronAPI.readFile(targetPath);
      if (!content) return 'original';

      const normalized = content.replace(/\\/g, '/').toLowerCase();

      if (normalized.includes('d20/lordaerontree-short')) return 'short';
      if (normalized.includes('d20/lordaerontree')) return 'tall';
      if (normalized.includes('tree/t00')) return 'retro';
      if (normalized.includes('v16/')) return 'v16';
      if (normalized.includes('v18/')) return 'v18';

      return 'original';
    } catch (e) {
      console.warn('[useWar3Settings] detectTreeMode failed:', e);
      return store.modSettings.tree;
    }
  };

  /**
   * 基于文件内容检测水面模式
   */
  const detectWaterMode = async (war3Path: string): Promise<ModSettings['water']> => {
    try {
      const retailDir = `${war3Path}/_retail_`;
      const baseDir = (await window.electronAPI?.pathExists(retailDir)) ? retailDir : war3Path;
      const shoreline = `${baseDir}/textures/shoreline1.dds`;
      const exists = await window.electronAPI?.pathExists(shoreline);
      return exists ? 'transparent' : 'realistic';
    } catch (e) {
      console.warn('[useWar3Settings] detectWaterMode failed:', e);
      return store.modSettings.water;
    }
  };

  /**
   * 基于目录是否存在检测植被模式
   */
  const detectFoliageMode = async (war3Path: string): Promise<boolean> => {
    try {
      const retailDir = `${war3Path}/_retail_`;
      const baseDir = (await window.electronAPI?.pathExists(retailDir)) ? retailDir : war3Path;
      const foliageDir = `${baseDir}/environment/foliage`;
      const exists = await window.electronAPI?.pathExists(foliageDir);
      return exists;
    } catch (e) {
      console.warn('[useWar3Settings] detectFoliageMode failed:', e);
      return store.modSettings.foliage;
    }
  };

  /**
   * 基于文件是否存在检测物体着色器
   */
  const detectObjectShaderMode = async (war3Path: string): Promise<boolean> => {
    try {
      const retailDir = `${war3Path}/_retail_`;
      const baseDir = (await window.electronAPI?.pathExists(retailDir)) ? retailDir : war3Path;
      const targetPath = `${baseDir}/shaders/ps/hd.bls`;
      return await window.electronAPI?.pathExists(targetPath);
    } catch (e) {
      console.warn('[useWar3Settings] detectObjectShaderMode failed:', e);
      return store.modSettings.objectShader;
    }
  };

  /**
   * 基于文件是否存在检测后处理
   */
  const detectPostProcessingMode = async (war3Path: string): Promise<boolean> => {
    try {
      const retailDir = `${war3Path}/_retail_`;
      const baseDir = (await window.electronAPI?.pathExists(retailDir)) ? retailDir : war3Path;
      const targetPath = `${baseDir}/shaders/ps/tonemap.bls`;
      return await window.electronAPI?.pathExists(targetPath);
    } catch (e) {
      console.warn('[useWar3Settings] detectPostProcessingMode failed:', e);
      return store.modSettings.postProcessing;
    }
  };

  // 保存MOD设置
  const saveModSettings = async (war3Path: string, newSettings: Partial<ModSettings>) => {
    console.log('[useWar3Settings] saveModSettings called:', { war3Path, newSettings });
    setState({ isLoading: true });

    // 强制等待 UI 渲染完成 (Hack: 利用事件循环机制)
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const updatedSettings = { ...store.modSettings, ...newSettings };
      console.log('[useWar3Settings] Updated settings state:', updatedSettings);

      setState({ modSettings: updatedSettings });

      if (window.electronAPI?.setConfig) {
        console.log('[useWar3Settings] Calling setConfig...');
        await window.electronAPI.setConfig('modSettings', updatedSettings);
      } else {
        console.warn('[useWar3Settings] window.electronAPI.setConfig is undefined');
      }

      // 优化触发逻辑：
      // 1. 只有当明确修改了 lighting 时才触发
      // 2. 如果当前正在切换 MOD 开关 (modEnabled)，则跳过更新，因为 MOD 开关本身会移动整个目录，避免冲突
      // 3. 只有在 MOD 处于开启状态时，才去修改 _retail_ 下的 MDL 文件
      if (
        newSettings.lighting !== undefined &&
        newSettings.modEnabled === undefined &&
        updatedSettings.modEnabled
      ) {
        console.log('[useWar3Settings] Lighting setting changed, updating MDL files...');
        // 确保调用正确的 API 名称
        if (window.electronAPI?.updateMdlLighting) {
          // 人为延迟以显示Loading效果，提升用户体验
          // await new Promise(resolve => setTimeout(resolve, 800)); // 已移除

          console.log('[useWar3Settings] Invoking updateMdlLighting IPC...');

          // 增加超时保护，防止 IPC 调用卡死导致 loading 无法消失
          const updatePromise = window.electronAPI.updateMdlLighting(
            war3Path,
            updatedSettings.lighting
          );

          // 15秒超时
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Update MDL lighting timeout')), 15000)
          );

          const result = await Promise.race([updatePromise, timeoutPromise]);
          console.log('[useWar3Settings] updateMdlLighting result:', result);
        } else {
          console.warn('[useWar3Settings] window.electronAPI.updateMdlLighting is undefined');
        }
      } else {
        console.log('[useWar3Settings] No lighting/modEnabled change detected, skipping updateMdlLighting');
      }

      // 如果修改了 UI 设置，执行 UI 资源替换和 unitskinMode 切换
      if (newSettings.ui !== undefined) {
        console.log('[useWar3Settings] UI setting changed, triggering updateUISettings and switchUnitSkinMode...');
        if (window.electronAPI?.updateUISettings) {
          console.log('[useWar3Settings] Invoking updateUISettings IPC...');

          // 增加超时保护
          const updateUiPromise = window.electronAPI.updateUISettings(war3Path, updatedSettings.ui);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Update UI settings timeout')), 15000)
          );

          await Promise.race([updateUiPromise, timeoutPromise]);
          console.log('[useWar3Settings] updateUISettings completed');
        } else {
          console.warn('[useWar3Settings] window.electronAPI.updateUISettings is undefined');
        }
      }

      // 如果修改了地形设置，执行地形资源切换 (terrainart <-> QMoff)
      if (newSettings.terrain !== undefined) {
        console.log('[useWar3Settings] Terrain setting changed, triggering updateTerrainSettings...');
        if (window.electronAPI?.updateTerrainSettings) {
          console.log('[useWar3Settings] Invoking updateTerrainSettings IPC...');

          // 增加超时保护
          const updateTerrainPromise = window.electronAPI.updateTerrainSettings(war3Path, updatedSettings.terrain);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Update terrain settings timeout')), 45000)
          );

          await Promise.race([updateTerrainPromise, timeoutPromise]);
          // 切换完成后，重新检测实际文件状态以更新高亮
          const detectedTerrainAfter = await detectTerrainMode(war3Path);
          setState({ modSettings: { ...store.modSettings, terrain: detectedTerrainAfter } });
          console.log('[useWar3Settings] updateTerrainSettings completed');
        } else {
          console.warn('[useWar3Settings] window.electronAPI.updateTerrainSettings is undefined');
        }
      }

      // 如果修改了树木设置，执行树木设置更新
      if (newSettings.tree !== undefined) {
        console.log(`\n>>> [TREE-FRONTEND] Setting change requested: ${newSettings.tree}`);
        if (window.electronAPI?.updateTreeSettings) {
          console.log('[useWar3Settings] Calling updateTreeSettings API...');

          const updateTreePromise = window.electronAPI.updateTreeSettings(war3Path, updatedSettings.tree);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Update tree settings timeout')), 30000)
          );

          await Promise.race([updateTreePromise, timeoutPromise]);

          // 重新检测状态
          const detectedTreeAfter = await detectTreeMode(war3Path);
          console.log(`[useWar3Settings] updateTreeSettings completed. Detected mode: ${detectedTreeAfter}`);
          setState({ modSettings: { ...store.modSettings, tree: detectedTreeAfter } });
        } else {
          console.error('[useWar3Settings] FATAL: window.electronAPI.updateTreeSettings is UNDEFINED!');
          // 打印出当前所有的 API，帮助调试
          console.log('[useWar3Settings] Available APIs:', Object.keys(window.electronAPI || {}));
        }
      }

      // 如果修改了水面设置，执行水面效果更新
      if (newSettings.water !== undefined) {
        console.log(`\n>>> [WATER-FRONTEND] Setting change requested: ${newSettings.water}`);
        if (window.electronAPI?.updateWaterSettings) {
          console.log('[useWar3Settings] Calling updateWaterSettings API...');
          const updateWaterPromise = window.electronAPI.updateWaterSettings(war3Path, updatedSettings.water);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Update water settings timeout')), 30000)
          );
          await Promise.race([updateWaterPromise, timeoutPromise]);
          const detectedWaterAfter = await detectWaterMode(war3Path);
          console.log(`[useWar3Settings] updateWaterSettings completed. Detected mode: ${detectedWaterAfter}`);
          setState({ modSettings: { ...store.modSettings, water: detectedWaterAfter } });
        }
      }

      // 如果修改了植被设置，执行植被效果更新
      if (newSettings.foliage !== undefined) {
        console.log(`\n>>> [FOLIAGE-FRONTEND] Setting change requested: ${newSettings.foliage}`);
        if (window.electronAPI?.updateFoliageSettings) {
          console.log('[useWar3Settings] Calling updateFoliageSettings API...');
          const updateFoliagePromise = window.electronAPI.updateFoliageSettings(war3Path, updatedSettings.foliage);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Update foliage settings timeout')), 60000)
          );
          await Promise.race([updateFoliagePromise, timeoutPromise]);
          const detectedFoliageAfter = await detectFoliageMode(war3Path);
          console.log(`[useWar3Settings] updateFoliageSettings completed. Detected: ${detectedFoliageAfter}`);
          setState({ modSettings: { ...store.modSettings, foliage: detectedFoliageAfter } });
        }
      }

      // 如果修改了物体着色器设置，执行更新
      if (newSettings.objectShader !== undefined) {
        console.log(`\n>>> [SHADER-FRONTEND] Object Shader change requested: ${newSettings.objectShader}`);
        if (window.electronAPI?.updateObjectShader) {
          await window.electronAPI.updateObjectShader(war3Path, updatedSettings.objectShader);
          const detectedAfter = await detectObjectShaderMode(war3Path);
          setState({ modSettings: { ...store.modSettings, objectShader: detectedAfter } });
        }
      }

      // 如果修改了后处理设置，执行更新
      if (newSettings.postProcessing !== undefined) {
        console.log(`\n>>> [SHADER-FRONTEND] Post Processing change requested: ${newSettings.postProcessing}`);
        if (window.electronAPI?.updatePostProcessing) {
          await window.electronAPI.updatePostProcessing(war3Path, updatedSettings.postProcessing);
          const detectedAfter = await detectPostProcessingMode(war3Path);
          setState({ modSettings: { ...store.modSettings, postProcessing: detectedAfter } });
        }
      }

      // 如果修改了环境渲染设置，执行更新
      if (newSettings.envRender !== undefined) {
        console.log(`\n>>> [SCRIPT-FRONTEND] Env Render change requested: ${newSettings.envRender}`);
        if (window.electronAPI?.updateEnvRenderSettings) {
          await window.electronAPI.updateEnvRenderSettings(war3Path, updatedSettings.envRender);
          const detectedAfter = await detectEnvRenderMode(war3Path);
          setState({ modSettings: { ...store.modSettings, envRender: detectedAfter } });
        }
      }

      // 如果修改了光晕设置
      if (newSettings.glow !== undefined) {
        console.log(`\n>>> [GLOW-FRONTEND] Glow change requested: ${newSettings.glow}`);
        if (window.electronAPI?.updateGlowSettings) {
          await window.electronAPI.updateGlowSettings(war3Path, updatedSettings.glow);
          const detectedAfter = await detectGlowMode(war3Path);
          setState({ modSettings: { ...store.modSettings, glow: detectedAfter } });
        }
      }

      // 如果修改了半身头像设置
      if (newSettings.half !== undefined) {
        console.log(`\n>>> [VISION-FRONTEND] Half Portrait change requested: ${newSettings.half}`);
        if (window.electronAPI?.updateHalfPortrait) {
          if (!updatedSettings.visionModPath) {
            console.warn('[useWar3Settings] VisionMod path not set, reverting half portrait setting');
            setState({ modSettings: { ...updatedSettings, half: !newSettings.half } });
            // 不抛出错误防止阻断其他逻辑，但显示错误消息
            // throw new Error('请先设置 VisionMod 路径'); 
            // 实际上这里的 throw 会被 catch 捕获并显示 toast，所以 throw 是合适的
            throw new Error('请先设置 VisionMod 路径 / Please set VisionMod path first');
          }
          await window.electronAPI.updateHalfPortrait(war3Path, updatedSettings.visionModPath, updatedSettings.half);
        }
      }

      // 如果修改了模型增强设置
      if (newSettings.modelEnhance !== undefined) {
        console.log(`\n>>> [VISION-FRONTEND] Model Enhance change requested: ${newSettings.modelEnhance}`);
        if (window.electronAPI?.updateModelEnhance) {
          if (!updatedSettings.visionModPath) {
            console.warn('[useWar3Settings] VisionMod path not set, reverting model enhance setting');
            setState({ modSettings: { ...updatedSettings, modelEnhance: !newSettings.modelEnhance } });
            throw new Error('请先设置 VisionMod 路径 / Please set VisionMod path first');
          }
          await window.electronAPI.updateModelEnhance(war3Path, updatedSettings.visionModPath, updatedSettings.modelEnhance);
        }
      }
    } catch (error) {
      console.error('Failed to save mod settings:', error);
      throw error;
    } finally {
      // 确保在任何情况下都关闭 loading
      console.log('[useWar3Settings] saveModSettings finished, setting isLoading to false');
      setState({ isLoading: false });
    }
  };

  // 生成MOD设置内容
  const generateModSettings = (settings: ModSettings): string => {
    return `[mod]
objectShader=${settings.objectShader ? '1' : '0'}
postProcessing=${settings.postProcessing ? '1' : '0'}
volumetricFog=${settings.volumetricFog ? '1' : '0'}
water=${settings.water === 'realistic' ? '1' : settings.water === 'transparent' ? '2' : '0'}
foliage=${settings.foliage ? '1' : '0'}
lighting=${settings.lighting === 'enhanced' ? '1' : settings.lighting === 'battle' ? '2' : settings.lighting === 'rpg' ? '3' : '0'}
half=${settings.half ? '1' : '0'}
ui=${settings.ui}
cam=${settings.cam ? '1' : '0'}
glow=${settings.glow ? '1' : '0'}
terrain=${settings.terrain}
tree=${settings.tree}
envRender=${settings.envRender ? '1' : '0'}
    modelEnhance=${settings.modelEnhance ? '1' : '0'}
    visionModPath=${settings.visionModPath}
    modEnabled=${settings.modEnabled ? '1' : '0'}

    [camera]
fov=${store.cameraSettings.fieldOfView}
angle=${store.cameraSettings.angleOfAttack}
`;
  };

  // 加载相机设置
  const loadCameraSettings = async (war3Path: string) => {
    try {
      // 从blizzard.j读取相机设置
      const blizzardPath = `${war3Path}/scripts/blizzard.j`;
      const exists = await window.electronAPI?.pathExists(blizzardPath);

      if (exists) {
        const content = await window.electronAPI?.readFile(blizzardPath);
        const cameraSettings = parseCameraSettings(content);
        setState({ cameraSettings });
      }
    } catch (error) {
      console.error('Failed to load camera settings:', error);
    }
  };

  // 解析相机设置
  const parseCameraSettings = (content: string): CameraSettings => {
    const settings = { ...store.cameraSettings };

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 查找相机设置行
      if (line.includes('SetCameraField(CAMERA_FIELD_FIELD_OF_VIEW')) {
        const match = line.match(/SetCameraField\(CAMERA_FIELD_FIELD_OF_VIEW,\s*([0-9.]+)/);
        if (match) {
          settings.fieldOfView = parseFloat(match[1]);
          settings.enabled = true;
        }
      }

      if (line.includes('SetCameraField(CAMERA_FIELD_ANGLE_OF_ATTACK')) {
        const match = line.match(/SetCameraField\(CAMERA_FIELD_ANGLE_OF_ATTACK,\s*([0-9.-]+)/);
        if (match) {
          settings.angleOfAttack = parseFloat(match[1]);
        }
      }
    }

    return settings;
  };

  // 基于文件存在情况检测地形模式，用于按钮高亮与状态同步
  const detectTerrainMode = async (war3Path: string): Promise<ModSettings['terrain']> => {
    try {
      const retailDir = `${war3Path}/_retail_`;
      const baseDir = (await window.electronAPI?.pathExists(retailDir)) ? retailDir : war3Path;
      const cliffPath = `${baseDir}/terrainart/clifftypes.slk`;
      const exists = await window.electronAPI?.pathExists(cliffPath);

      if (!exists) return 'original';

      // 如果存在，进一步细分
      // 注：这里由于 SLK 是二进制，暂时只做路径包含检测或信任配置
      // 为了稳定起见，如果检测到文件存在，而配置中是 retro/v16/v18，则保持配置
      const currentStored = store.modSettings.terrain;
      if (['retro', 'v16', 'v18'].includes(currentStored)) {
        return currentStored;
      }

      return 'latest';
    } catch (e) {
      console.warn('[useWar3Settings] detectTerrainMode failed:', e);
      return store.modSettings.terrain;
    }
  };

  // 保存相机设置
  const saveCameraSettings = async (war3Path: string, newSettings: Partial<CameraSettings>) => {
    try {
      const updatedSettings = { ...store.cameraSettings, ...newSettings };
      setState({ cameraSettings: updatedSettings });

      // 修改blizzard.j文件
      const blizzardPath = `${war3Path}/scripts/blizzard.j`;
      const exists = await window.electronAPI?.pathExists(blizzardPath);

      if (exists) {
        const content = await window.electronAPI?.readFile(blizzardPath);
        const modifiedContent = modifyBlizzardScript(content, updatedSettings);
        await window.electronAPI?.writeFile(blizzardPath, modifiedContent);

        // 备份到quenching目录
        const backupPath = `${war3Path}/Quenching/scripts/blizzard.j`;
        await window.electronAPI?.copyFile(blizzardPath, backupPath);
      }

      // 同时保存到MOD设置
      await saveModSettings(war3Path, { cam: updatedSettings.enabled });

    } catch (error) {
      console.error('Failed to save camera settings:', error);
      throw error;
    }
  };

  // 修改blizzard.j脚本
  const modifyBlizzardScript = (content: string, settings: CameraSettings): string => {
    // 简单的替换逻辑，实际可能需要更复杂的解析
    let newContent = content;

    // TODO: 实现blizzard.j的修改逻辑
    // 这里暂时只是占位，实际需要根据settings修改SetCameraField等函数调用

    return newContent;
  };

  const statics = {};

  return Object.assign(() => ({
    store,
    loadSettings,
    saveSettings,
    toggleGameMode,
    setResolution,
    loadModSettings,
    saveModSettings,
    loadCameraSettings,
    saveCameraSettings
  }), {
    store,
    setState,
    loadSettings,
    saveSettings,
    toggleGameMode,
    setResolution,
    loadModSettings,
    saveModSettings,
    loadCameraSettings,
    saveCameraSettings,
    statics
  });
});

// React Hook
export const useWar3Settings = () => {
  // 获取reaxel实例
  const settings = reaxel_War3Settings();
  const [state, setLocalState] = useState(() => ({
    settings: settings.store.settings,
    cameraSettings: settings.store.cameraSettings,
    modSettings: settings.store.modSettings,
    isLoading: settings.store.isLoading
  }));

  useEffect(() => {
    // 强制同步函数
    const forceSync = () => {
      const current = settings.store;
      // 深度同步，防止引用变化被 React 忽略
      setLocalState({
        settings: { ...current.settings },
        cameraSettings: { ...current.cameraSettings },
        modSettings: { ...current.modSettings },
        isLoading: current.isLoading
      });
    };

    // 初始同步
    forceSync();

    // 轮询检查状态变化
    const timer = setInterval(forceSync, 500);
    return () => clearInterval(timer);
  }, [settings.store]);

  return {
    settings: state.settings,
    cameraSettings: state.cameraSettings,
    modSettings: state.modSettings,
    isLoading: state.isLoading,
    loadSettings: settings.loadSettings,
    saveSettings: settings.saveSettings,
    toggleGameMode: settings.toggleGameMode,
    setResolution: settings.setResolution,
    saveModSettings: settings.saveModSettings,
    loadModSettings: settings.loadModSettings,
    saveCameraSettings: settings.saveCameraSettings,
    loadCameraSettings: settings.loadCameraSettings
  };
};
