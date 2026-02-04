/*为不同时区提供响应式渲染*/
export const Refaxel_Timezone = function({
	defaultTzDatabaseName = "Asia/Shanghai",
} = {}){
	const {
		store , setState , mutate,
	} = createReaxable({
		timezone : defaultTzDatabaseName ,
	});
	
	const processer = (timestamp:number,options:options) => {
		let date ;
		const {unix = false,format,tz} = options;
		if(unix){
			date = dayjs.unix(timestamp);
		}
		/*如果显式设置时区,就用设置的*/
		if(tz){
			date = dayjs.tz(date,tz);
		}else {
			date = dayjs.tz(date,store.timezone);
		}
		
		if( format === true ) {
			return date.format("YYYY-MM-DD HH:mm:ss");
		}else if(typeof format === 'string'){
			return date.format(format);
		}else {
			return date.valueOf();
		}
	}
	
	const rtn = {
		get tz(){
			return store.timezone;
		} ,
		setTz( timezone: string ){
			setState({ timezone });
		} ,
		timezone : ( timestamp = Date.now() , options: options = {} ) => {
			/*不是组件却在收集依赖,收集的是调用其组件的依赖*/
			collectDeps(store);
			return processer(timestamp , options);
		} ,
		Timezone : reaxper(( props: React.PropsWithChildren<options> ) => {
			collectDeps(store);
			const { children : timestamp = Date.now() as any } = props;
			return processer(timestamp , _.omit(props , "children"));
		}) ,
	};
	
	return Object.assign(() => rtn , {
		store ,
		setState ,
		mutate
	});
	type options = {
		/*是否将时间格式化?调用的是dayjs.format('YYYY-MM-DD...')*/
		format? : string|boolean,
		/*是否使用unix秒作为时间戳,默认[false:毫秒]*/
		unix? : boolean,
		/*强制使用某时区,不受state影响*/
		tz? : string;
	};
};
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { collectDeps } from 'reaxes';
import dayjs from 'dayjs';

