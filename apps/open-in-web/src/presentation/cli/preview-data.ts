import { readdir, stat } from "node:fs/promises";
import { statSync } from "node:fs";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { inferType, type FileType, type PreviewData } from "./file-types";

const MAX_DEPTH = 4;
const MAX_ITEMS_PER_DIR = 500;
const MAX_TEXT_SIZE = 1024 * 1024; // 1 MB
const MAX_SRC_SIZE = 4 * 1024 * 1024; // 4 MB for images/pdfs

export function findPackageRoot(start: string): string {
	let current = start;
	while (current !== dirname(current)) {
		try {
			if (statSync(resolve(current, "package.json")).isFile()) {
				return current;
			}
		} catch {
			// continue up
		}
		current = dirname(current);
	}
	throw new Error("Could not find package root");
}

function isCompiledExe(): boolean {
	return import.meta.path.includes("~BUN");
}

export function getDistPreviewDir(): string {
	if (isCompiledExe()) {
		return resolve(dirname(process.execPath), "preview");
	}
	return resolve(findPackageRoot(dirname(import.meta.path)), "dist/preview");
}

function toRawUrl(baseDir: string, targetPath: string): string {
	const rel = relative(baseDir, targetPath).replace(/\\/g, "/");
	const parts = rel
		.split("/")
		.filter(Boolean)
		.map((p) => encodeURIComponent(p));
	return "./raw/" + parts.join("/");
}

function mimeForFile(ext: string): string {
	switch (ext.toLowerCase()) {
		case "png":
			return "image/png";
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "gif":
			return "image/gif";
		case "webp":
			return "image/webp";
		case "svg":
			return "image/svg+xml";
		case "bmp":
			return "image/bmp";
		case "ico":
			return "image/x-icon";
		case "pdf":
			return "application/pdf";
		default:
			return "application/octet-stream";
	}
}

async function toBase64Src(targetPath: string, ext: string): Promise<string | undefined> {
	try {
		const s = await stat(targetPath);
		if (!s.isFile() || s.size > MAX_SRC_SIZE) return undefined;
		const content = await Bun.file(targetPath).arrayBuffer();
		return `data:${mimeForFile(ext)};base64,${Buffer.from(content).toString("base64")}`;
	} catch {
		return undefined;
	}
}

function shouldReadAsText(type: FileType, size: number): boolean {
	if (type === "image" || type === "pdf") return false;
	return size <= MAX_TEXT_SIZE;
}

export interface BuildOptions {
	baseDir: string;
	depth?: number;
	static?: boolean;
}

export async function buildPreviewData(
	targetPath: string,
	options: BuildOptions,
): Promise<PreviewData> {
	const { baseDir, depth = 0, static: isStatic = false } = options;
	const s = await stat(targetPath);
	const isDir = s.isDirectory();
	const ext = isDir ? "" : extname(targetPath).toLowerCase().replace(/^\./, "");
	const name = basename(targetPath);
	const type: FileType = isDir ? "directory" : inferType(ext);
	const data: PreviewData = { name, path: targetPath, type, ext };

	if (type === "directory") {
		const items = (await readdir(targetPath)).slice(0, MAX_ITEMS_PER_DIR);
		data.items = items;

		if (isStatic && depth < MAX_DEPTH) {
			const children: Record<string, PreviewData> = {};
			for (const item of items) {
				const childPath = resolve(targetPath, item);
				try {
					children[item] = await buildPreviewData(childPath, {
						baseDir,
						depth: depth + 1,
						static: true,
					});
				} catch {
					// skip unreadable children
				}
			}
			data.children = children;
		}
	} else if (type === "image" || type === "pdf") {
		if (isStatic) {
			data.src = await toBase64Src(targetPath, ext);
		} else {
			data.src = toRawUrl(baseDir, targetPath);
		}
	} else if (shouldReadAsText(type, s.size)) {
		try {
			data.content = await Bun.file(targetPath).text();
		} catch {
			data.type = "unknown";
		}
	} else {
		data.type = "unknown";
	}

	return data;
}

export function injectDataScript(html: string, data: PreviewData): string {
	const script = `<script>window.__DATA__=${JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")};</script>`;
	const existing = /<script>window\.__DATA__=[\s\S]*?<\/script>/;
	if (existing.test(html)) {
		return html.replace(existing, script);
	}
	return html.replace("</head>", `${script}</head>`);
}
