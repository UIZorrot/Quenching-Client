export const isPromise = <T = any>( target : any ) : target is Promise<T>  => {
	
	if (
		_.isObject( target ) &&
		target instanceof Promise
	) {
		return true;
	}
	return false;
};
