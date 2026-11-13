import { cp, mkdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { inferType, type FileType, type PreviewData } from "./file-types";
import { buildPreviewData, getDistPreviewDir, injectDataScript } from "./preview-data";
import { renderStaticPreview } from "./preview-static";
import { servePreview } from "./preview-server";

export { inferType };
export type { FileType, PreviewData };

interface PreviewOptions {
	noOpen?: boolean;
	serve?: boolean;
	/** Explicit single-file static HTML (temp file via file://) */
	static?: boolean;
}

export async function previewFile(target: string, options: PreviewOptions = {}): Promise<string> {
	const absPath = resolve(target);
	const s = await stat(absPath);
	const isDir = s.isDirectory();
	const baseDir = isDir ? absPath : dirname(absPath);

	const distPreview = getDistPreviewDir();
	const previewDir = resolve(tmpdir(), `open-files-preview-${Date.now()}`);

	await mkdir(previewDir, { recursive: true });

	// Default: serve a real site on localhost — file:// breaks fonts/CDN/
	// history routing and sniffs charsets badly (garbled Thai etc.)
	const staticMode = options.static === true;
	const data = await buildPreviewData(absPath, { baseDir, static: staticMode });

	if (staticMode) {
		return renderStaticPreview(data, distPreview, previewDir, options.noOpen);
	}

	// Server mode (legacy, for large directories or dynamic raw access)
	await cp(distPreview, previewDir, { recursive: true });

	const indexPath = resolve(previewDir, "index.html");
	let html = await Bun.file(indexPath).text();
	html = html.replace(/ crossorigin/g, "");
	html = html.replace(/ type="module"/g, "");
	html = html.replace(/<script src="(\.\/assets\/[^"]+\.js)"><\/script>/, '<script defer src="$1"></script>');
	html = injectDataScript(html, data);
	await Bun.write(indexPath, html);

	return servePreview(previewDir, baseDir, indexPath, html, options.noOpen);
}
