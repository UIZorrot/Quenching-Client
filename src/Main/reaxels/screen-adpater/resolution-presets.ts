import { reaxel_MainProcessHub } from '../../reaxels/main-process-hub';
import { screen, Size } from 'electron';

function useScaleConverter({ width, height }: Record<"width" | "height", number>) {
	return { width, height };
}

export type Preset = {
	size: Size;
	zoomFactor: number;
}
function currentDisplayBounds() {
	const mainWindow = reaxel_MainProcessHub?.store?.mainWindow;
	return mainWindow ? screen.getDisplayMatching(mainWindow.getBounds()).bounds : screen.getPrimaryDisplay().bounds;
}
export const mainWindowResolutionPresets = {
	get auto(): Preset {
		const current = currentDisplayBounds();
		const min = Math.min(current.height, current.width);
		return {
			size: {
				width: min * 0.8,
				height: min * 0.8,
			},
			zoomFactor: min / 1350,
		}
	},
	get _480P(): Preset {
		const mainWindow = reaxel_MainProcessHub?.store?.mainWindow;
		mainWindow?.webContents.setZoomFactor(.35);
		return {
			size: useScaleConverter({
				width: 480 * 0.9,
				height: 480 * 0.9,
			}),
			zoomFactor: .41
		}
	},
	get _720P(): Preset {
		return {
			size: useScaleConverter({
				width: 720 * 0.9,
				height: 720 * 0.9,
			}),
			zoomFactor: .62,
		};
	},
	get _1080P(): Preset {
		return {
			size: useScaleConverter({
				width: 1080 * 0.9,
				height: 1080 * 0.9,
			}),
			zoomFactor: .9,
		};
	},
	get _1440P(): Preset {
		return {
			size: useScaleConverter({
				width: 1440 * 0.9,
				height: 1440 * 0.9,
			}),
			zoomFactor: 1.2,
		};
	},
	get _2160P(): Preset {
		return {
			size: useScaleConverter({
				width: 2160 * 0.9,
				height: 2160 * 0.9,
			}),
			zoomFactor: 1.85,
		};
	},
};


