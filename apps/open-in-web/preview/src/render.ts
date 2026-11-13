import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import toc from "markdown-it-toc-done-right";
import { getHighlighter } from "./shiki";
import type { PreviewData } from "./types";

export { getHighlighter } from "./shiki";

export async function renderMarkdown(content: string): Promise<string> {
	const highlighter = await getHighlighter();

	const md = new MarkdownIt({
		html: true,
		linkify: true,
		typographer: true,
		highlight: (code, lang) => {
			try {
				return highlighter.codeToHtml(code, {
					lang: lang || "text",
					theme: "github-dark",
				});
			} catch {
				return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
			}
		},
	});

	md.use(anchor);
	md.use(toc, { listType: "ul" });

	return md.render(`[[toc]]\n\n${content}`);
}

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function getData(): PreviewData {
	return (
		window.__DATA__ ?? {
			name: "unknown",
			path: "",
			type: "unknown",
		}
	);
}
