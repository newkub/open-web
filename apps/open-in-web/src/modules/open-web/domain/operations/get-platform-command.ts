import type { Platform } from "#modules/open-web/types";

export const getPlatform = (): Platform => {
	return process.platform as Platform;
};
