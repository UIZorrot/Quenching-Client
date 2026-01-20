export const useDisable = (disabled:boolean|number,reason?:string) => {
	type Disabled = {
		disabled : boolean;
		reason?:string;
	};
	return {disabled:!!disabled,reason} as Disabled;
}
