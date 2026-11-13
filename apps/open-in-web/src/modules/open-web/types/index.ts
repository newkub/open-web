export type BrowserName = "chrome" | "firefox" | "safari" | "edge" | "default";

export type Platform = "win32" | "darwin" | "linux";

export interface OpenUrlOptions {
	readonly url: string;
	readonly browser?: BrowserName;
}

export interface OpenUrlResult {
	readonly success: boolean;
	readonly url: string;
	readonly message: string;
}
