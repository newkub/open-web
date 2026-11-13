import open, { apps } from "open";
import type { BrowserName } from "#modules/open-web/types";
import type { IOpenUrlPorts } from "#modules/open-web/ports";

const browserApp: Record<BrowserName, string | readonly string[] | undefined> = {
	chrome: apps.chrome,
	firefox: apps.firefox,
	safari: "safari",
	edge: apps.edge,
	default: undefined,
};

export const createBrowserAdapter = (): IOpenUrlPorts => ({
	openUrl: async (url: string, browser?: BrowserName) => {
		const name = browser ? browserApp[browser] : undefined;
		const options = name ? { app: { name }, wait: false } : { wait: false };
		await open(url, options);
	},
	getPlatform: () => process.platform,
});
