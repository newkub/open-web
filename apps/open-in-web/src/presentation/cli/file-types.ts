export type FileType =
	| "markdown"
	| "code"
	| "html"
	| "image"
	| "pdf"
	| "csv"
	| "json"
	| "text"
	| "directory"
	| "unknown";

export interface PreviewData {
	name: string;
	path: string;
	type: FileType;
	ext?: string;
	content?: string;
	src?: string;
	items?: string[];
	children?: Record<string, PreviewData>;
}

const imageExts = new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"bmp",
	"webp",
	"svg",
	"ico",
]);

const codeExts = new Set([
	"js",
	"ts",
	"tsx",
	"jsx",
	"rs",
	"py",
	"go",
	"c",
	"cpp",
	"h",
	"hpp",
	"java",
	"php",
	"rb",
	"swift",
	"kt",
	"sh",
	"bash",
	"ps1",
	"psm1",
	"css",
	"scss",
	"sass",
	"less",
	"xml",
	"sql",
	"log",
	"ini",
	"cfg",
	"conf",
	"dockerfile",
	"vue",
	"svelte",
]);

const EXTENSION_TYPE_MAP: Record<string, FileType> = {
	md: "markdown",
	markdown: "markdown",
	html: "html",
	htm: "html",
	pdf: "pdf",
	csv: "csv",
	json: "json",
};

export function inferType(ext: string): FileType {
	const e = ext.toLowerCase().replace(/^\./, "");
	return (
		EXTENSION_TYPE_MAP[e] ??
		(imageExts.has(e) ? "image" : codeExts.has(e) ? "code" : "text")
	);
}
