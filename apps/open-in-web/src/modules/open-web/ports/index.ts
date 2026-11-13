import type { BrowserName } from "#modules/open-web/types";

export interface IOpenUrlPorts {
	readonly openUrl: (url: string, browser?: BrowserName) => Promise<void>;
	readonly getPlatform: () => string;
}
