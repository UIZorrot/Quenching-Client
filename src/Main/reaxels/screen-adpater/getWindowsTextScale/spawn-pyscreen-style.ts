export const getTextScaleFactorByPyScreensInfo = async () => {
	try {
		const screens = await getCachedPyScreensInfo();
		const primaryScreen = screens.find(s => s.is_primary);

		if (!primaryScreen) {
			throw new Error('No primary screen found');
		}

		if (!primaryScreen.text_scale_factor || typeof primaryScreen.text_scale_factor !== 'number') {
			throw new Error('Text scale factor not available from py_screeninfo');
		}

		return primaryScreen.text_scale_factor;
	} catch (error) {
		throw new Error(`py_screeninfo failed: ${error.message}`);
	}
}

import { getCachedPyScreensInfo } from '../getScreensInfo';
