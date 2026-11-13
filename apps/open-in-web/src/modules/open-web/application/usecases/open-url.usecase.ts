import { normalizeUrl, validateUrl } from "#modules/open-web/domain";
import type { OpenUrlOptions, OpenUrlResult } from "#modules/open-web/types";
import type { IOpenUrlPorts } from "../../ports";

export const createOpenUrlUseCase = (ports: IOpenUrlPorts) => {
	return async (options: OpenUrlOptions): Promise<OpenUrlResult> => {
		if (!validateUrl(options.url)) {
			return {
				success: false,
				url: options.url,
				message: "URL or path is required",
			};
		}

		const normalizedUrl = normalizeUrl(options.url);

		try {
			await ports.openUrl(normalizedUrl, options.browser);
			return {
				success: true,
				url: normalizedUrl,
				message: `Opened: ${normalizedUrl}`,
			};
		} catch (error) {
			return {
				success: false,
				url: normalizedUrl,
				message: error instanceof Error ? error.message : String(error),
			};
		}
	};
};
