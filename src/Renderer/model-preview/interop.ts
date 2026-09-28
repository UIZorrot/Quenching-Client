/** CJS packages expose a nested default in native ESM/esbuild but not webpack. */
export function cjsDefault<T>(value: T): T { return (value as any)?.default || value; }
