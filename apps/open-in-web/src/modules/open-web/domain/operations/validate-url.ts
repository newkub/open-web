import { resolve } from "node:path";

const isWebUrl = (s: string): boolean => /^https?:\/\//i.test(s);
const isFileUrl = (s: string): boolean => /^file:\/\//i.test(s);
const isDrivePath = (s: string): boolean => /^[A-Za-z]:[\\/]/.test(s);

export const validateUrl = (url: string): boolean => {
	return typeof url === "string" && url.trim().length > 0;
};

export const normalizeUrl = (url: string): string => {
	const s = url.trim();
	if (isWebUrl(s) || isFileUrl(s)) return s;
	// A drive path is absolute on every platform: node:path would resolve it as a relative POSIX name on Linux.
	if (isDrivePath(s)) return `file:///${s.replaceAll(/[/\\]+/g, "/")}`;
	return Bun.pathToFileURL(resolve(s)).href;
};

export const validateOptions = (options: { url: string }): boolean => {
	return validateUrl(options.url);
};
