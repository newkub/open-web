/**
 * @wrikka/open-web - Open web pages and documentation in browser
 * Public API exports
 */

export { createBrowserAdapter } from "./adapters/browser";
export { createOpenUrlUseCase } from "./modules/open-web/application";
export { normalizeUrl, validateUrl } from "./modules/open-web/domain";
export type { IOpenUrlPorts } from "./modules/open-web/ports";
export type {
	BrowserName,
	OpenUrlOptions,
	OpenUrlResult,
} from "./modules/open-web/types";
export { createCli } from "./presentation/cli";
