const windowsTextScale = await getTextScaleFactor();
/**
 * 可能有多个显示器,每个显示器的scale均可能不同
 * 而textscale则是全局统一的,可以直接获取
 */
export const getWindowsDisplayScale = (display = screen.getPrimaryDisplay()) => display.scaleFactor / windowsTextScale;

import { getTextScaleFactor } from '../getWindowsTextScale';
import { screen } from 'electron';
import type { Display } from 'electron';
