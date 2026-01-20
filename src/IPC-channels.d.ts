export type IpcJsonHandle = {
	'screen-info': {
		data: { type: "primary" },
		reply: {
			primaryScreen: Display
		}
	},
	'fetch-ahk_cp-status': {
		data: boolean;
		reply: boolean;
	};
	'clipboard': {
		data: { operation: 'write'; value: string };
		reply: null;
	} | {
		data: { operation: 'read'; value: null };
		reply: string;
	};
}
export type IpcJsonOn = {
	'war3-process-existence': {
		data: boolean;
	};
	'ahk': {
		data: { key: string; value: boolean | number }[];
	};
	'monitor-war3exe-process': {
		data: 'start' | 'stop';
	};
	'spawn': {
		data: 'war3-ahk';
	};
	'exit-ahk': {
		data: null;
	};
	'shortcut': {
		data: { key: string; type: 'keydown' };
	};
	'system-info': {
		data: { systemLanguage: Languages };
	};
	'ahk-cp-status': {
		data: boolean;
	};
	'clear-localstorage': {
		data: null;
	};
	'fetch-ahk_cp-status': {
		data: boolean;
	};
	'open-url': {
		data: string;
	};
	'screen-info': {
		data: any;
	};
};

import type { Display } from 'electron/renderer';
import type { SupportedLanguage as Languages } from './Renderer/utils/i18n';
