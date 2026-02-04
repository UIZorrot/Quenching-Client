/**
 * 包裹React路由组件
 * @example
 * <Route element = {toolkits.withOutlet(<ACertainComponent/>)}/>
 */
export const withOutlet = ( ReactElement:React.ReactElement ) => {
	return <>
		{ReactElement}
		<Outlet />
	</>;
};
/**
 * @example
const Routing = utils.withRouter((routerProps) => (props) => {
	console.log(routerProps);
	return <>{routerProps.parmas.ID}</>
});
 
 */
export const withRouter = ( JSX : (routerProps:routerProps) => React.ReactNode&React.ReactElement ):React.ReactElement => {
	return JSX(useRouter());
};

import { Outlet  } from 'react-router-dom';
import { useRouter } from '../../common';


type routerProps = ReturnType<typeof useRouter>;
