import { resolve } from "node:path";
import open from "open";
import type { PreviewData } from "./file-types";
import { injectDataScript } from "./preview-data";

async function inlineBundle(html: string, assetsDir: string, outPath: string): Promise<void> {
	let result = html;

	// Strip module/crossorigin attributes so the HTML works from file://
	result = result.replace(/ crossorigin/g, "");
	result = result.replace(/ type="module"/g, "");

	// Inline CSS if present
	const cssMatches = [...result.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\.\/assets\/([^"]+)"[^>]*>/g)];
	for (const match of cssMatches) {
		const cssFile = resolve(assetsDir, match[1]);
		try {
			const css = await Bun.file(cssFile).text();
			result = result.replace(match[0], `<style>${css.replace(/<\/style>/gi, "<\\/style>")}</style>`);
		} catch {
			// leave as-is
		}
	}

	// Inline JS
	const jsMatch = result.match(/<script[^>]*src="\.\/assets\/([^"]+\.js)"[^>]*>\s*<\/script>/);
	if (jsMatch) {
		const jsFile = resolve(assetsDir, jsMatch[1]);
		const jsContent = await Bun.file(jsFile).text();
		const safeContent = jsContent.replace(/<\/script>/gi, "<\\/script>");
		const tag = `<script>${safeContent}</script>`;
		result = result.replace(jsMatch[0], tag);
	}

	await Bun.write(outPath, result);
}

export async function renderStaticPreview(
	data: PreviewData,
	distPreview: string,
	previewDir: string,
	noOpen?: boolean,
): Promise<string> {
	// Single self-contained HTML file, no server needed
	const assetsDir = resolve(distPreview, "assets");
	const indexPath = resolve(previewDir, "index.html");
	const distIndexPath = resolve(distPreview, "index.html");
	let html = await Bun.file(distIndexPath).text();
	html = html.replace(/ crossorigin/g, "");
	html = html.replace(/<script[^>]*src="\.\/assets\/[^"]+"[^>]*>\s*<\/script>/, (m) => {
		// keep the tag as-is for inlineBundle to find
		return m.replace(" type=\"module\"", "").replace(" crossorigin", "");
	});
	html = injectDataScript(html, data);
	await inlineBundle(html, assetsDir, indexPath);

	if (noOpen) {
		return indexPath;
	}

	const fileUrl = "file://" + indexPath.replace(/\\/g, "/");
	await open(fileUrl);
	return indexPath;
}
