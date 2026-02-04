//@ts-nocheck
declare global {
	// export const requester : typeof import('#src/requester').requester;
	export const _ : typeof import('lodash');
	export const reaxel : typeof import('reaxes')['reaxel'];
	export const createReaxable : typeof import('reaxes')['createReaxable'];
	export const distinctCallback : typeof import('reaxes')['distinctCallback'];
	export const obsReaction : typeof import('reaxes')['obsReaction'];
	export const collectDeps : typeof import('reaxes')['collectDeps'];
	export const reaxper : typeof import('reaxes-react')['reaxper'];
	export const Reaxlass : typeof import('reaxes-react')['Reaxlass'];
	
	export const xPromise : typeof import('reaxes-utils')['xPromise'];
	export const utils : typeof import('#generic/utils');
	export const crayon : typeof import('#generic/utils')['crayon'];
	export const logProxy : typeof import('#generic/utils')['logProxy'];
	export const makePair : typeof import('#generic/utils')['makePair'];
	export const assert : typeof import('#generic/utils')['assert'];
	export const decodeQueryString : typeof import('#generic/utils')['decodeQueryString'];
	export const encodeQueryString : typeof import('#generic/utils')['encodeQueryString'];
	export const stringify : typeof import('#generic/utils')['stringify'];
	
	
	// export const React: typeof ReactModule;
	// export const useLayoutEffect : typeof React.useLayoutEffect;
	// export const useCallback : typeof React.useCallback;
	// export const useState : typeof React.useState;
	// export const useEffect : typeof React.useEffect;
	// export const useRef : typeof React.useRef;
	
	namespace React {
		type R = typeof import('react');
		//@ts-expect-error
		export = R;
	}
	
	const __DEV__ : boolean;
	
	export const electron : {
		ipcRenderer : typeof import('electron')['ipcRenderer']
	}
}
// import * as ReactModule from 'react';

export {}
