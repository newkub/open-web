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

declare global {
	interface Window {
		__DATA__?: PreviewData;
	}
}
