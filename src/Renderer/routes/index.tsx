export const Routing = reaxper( () => {
	
	return <HashRouter>
		<Routes>
			<Route
				path = "tests"
				Component = { RuntimeTester }
			/>
			
			<Route
				path = "/"
			>
				<Route
					index
				/>
				<Route
					path = "hotkey-enhancer"
					Component = { HotkeyEnhancer }
				/>
				<Route
					path = "cheats"
					Component = { Cheats }
				/>
			</Route>
		
		</Routes>
	</HashRouter>;
} );


import { RuntimeTester } from '#renderer/pages/Runtime-Tester';
import { Cheats } from '#renderer/pages/Cheats';
import { HotkeyEnhancer } from '#renderer/pages/Hotkey-Enhancer';
import { HashRouter , Route , Routes , Navigate} from 'react-router-dom';
