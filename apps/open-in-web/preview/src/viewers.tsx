import { For, Show, createEffect, createResource, createSignal } from "solid-js";
import { getHighlighter, escapeHtml, renderMarkdown } from "./render";
import type { PreviewData } from "./types";

async function copyText(text: string) {
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		// fallback
		const ta = document.createElement("textarea");
		ta.value = text;
		document.body.appendChild(ta);
		ta.select();
		document.execCommand("copy");
		document.body.removeChild(ta);
	}
}

function CopyButton(props: { text: string }) {
	const [copied, setCopied] = createSignal(false);
	const handleCopy = async () => {
		await copyText(props.text);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};
	return (
		<button class="copy-button" onClick={handleCopy} title="Copy to clipboard">
			{copied() ? "Copied!" : "Copy"}
		</button>
	);
}

function decorateMarkdownCodeBlocks(container: HTMLElement) {
	if (!container) return;
	const blocks = container.querySelectorAll("pre");
	for (const block of blocks) {
		if (block.querySelector(".copy-button")) continue;
		const code = block.querySelector("code");
		if (!code) continue;
		const text = code.textContent ?? "";
		const wrapper = document.createElement("div");
		wrapper.className = "code-block";
		const header = document.createElement("div");
		header.className = "code-block-header";
		const lang = document.createElement("span");
		lang.className = "code-block-lang";
		lang.textContent = block.dataset.language || "code";
		header.appendChild(lang);

		const copy = document.createElement("button");
		copy.className = "copy-button";
		copy.textContent = "Copy";
		copy.title = "Copy to clipboard";
		copy.addEventListener("click", async () => {
			await copyText(text);
			copy.textContent = "Copied!";
			setTimeout(() => (copy.textContent = "Copy"), 1500);
		});
		header.appendChild(copy);

		block.parentElement?.insertBefore(wrapper, block);
		wrapper.appendChild(header);
		wrapper.appendChild(block);
	}
}

export function MarkdownViewer(props: { data: PreviewData }) {
	const [html] = createResource(
		() => props.data.content,
		async (content) => renderMarkdown(content ?? ""),
	);

	let bodyRef: HTMLDivElement | undefined;
	createEffect(() => {
		const h = html();
		if (bodyRef && h) {
			bodyRef.innerHTML = h;
			decorateMarkdownCodeBlocks(bodyRef);
		}
	});

	return (
		<Show when={!html.loading} fallback={<div class="loading">Rendering markdown...</div>}>
			<div ref={(el) => (bodyRef = el)} class="markdown-body" />
		</Show>
	);
}

export function CodeViewer(props: { data: PreviewData }) {
	const [html] = createResource(
		() => props.data,
		async (data) => {
			const highlighter = await getHighlighter();
			try {
				return highlighter.codeToHtml(data.content ?? "", {
					lang: data.ext || "text",
					theme: "github-dark",
				});
			} catch {
				return `<pre class="shiki"><code>${escapeHtml(data.content ?? "")}</code></pre>`;
			}
		},
	);

	return (
		<Show when={!html.loading} fallback={<pre class="text-content">{props.data.content}</pre>}>
			<div class="code-block">
				<div class="code-block-header">
					<span class="code-block-lang">{props.data.ext || "text"}</span>
					<CopyButton text={props.data.content ?? ""} />
				</div>
				<div class="code-viewer" innerHTML={html() ?? ""} />
			</div>
		</Show>
	);
}

export function HtmlViewer(props: { data: PreviewData }) {
	return (
		<iframe
			srcdoc={props.data.content}
			title={props.data.name}
			class="html-frame"
			sandbox="allow-scripts"
		/>
	);
}

export function ImageViewer(props: { data: PreviewData }) {
	return (
		<div class="image-wrapper">
			<img src={props.data.src} alt={props.data.name} class="image-viewer" />
		</div>
	);
}

export function PdfViewer(props: { data: PreviewData }) {
	return <iframe src={props.data.src} title={props.data.name} class="pdf-frame" />;
}

export function CsvTable(props: { data: PreviewData }) {
	const rows = () =>
		(props.data.content ?? "")
			.split("\n")
			.map((line) => line.split(",").map((cell) => cell.trim()));

	return (
		<table class="csv-table">
			<For each={rows()}>
				{(row, index) => (
					<tr>
						<For each={row}>
							{(cell) => (
								<Show when={index() === 0} fallback={<td>{cell}</td>}>
									<th>{cell}</th>
								</Show>
							)}
						</For>
					</tr>
				)}
			</For>
		</table>
	);
}

export function JsonTree(props: { data: PreviewData }) {
	const formatted = () => {
		try {
			return JSON.stringify(
				JSON.parse(props.data.content ?? "{}"),
				null,
				2,
			);
		} catch {
			return props.data.content ?? "";
		}
	};
	return <pre class="json-content">{formatted()}</pre>;
}

export function TextViewer(props: { data: PreviewData }) {
	return <pre class="text-content">{props.data.content}</pre>;
}

function getItemIcon(name: string) {
	if (!name.includes(".")) return "📁";
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	if (["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "ico"].includes(ext)) return "🖼️";
	if (["pdf"].includes(ext)) return "📄";
	if (["md", "markdown"].includes(ext)) return "📝";
	if (["html", "htm"].includes(ext)) return "🌐";
	if (["csv", "json"].includes(ext)) return "📊";
	if (["js", "ts", "tsx", "jsx", "py", "go", "rs", "c", "cpp", "java", "php", "rb"].includes(ext)) return "💻";
	return "📎";
}

export function DirectoryList(props: {
	data: PreviewData;
	onOpen?: (name: string) => void;
	path?: string[];
}) {
	const handleClick = (item: string) => (e: Event) => {
		if (props.data.children) {
			e.preventDefault();
			props.onOpen?.(item);
		}
	};

	return (
		<ul class="directory-list">
			<For each={props.data.items ?? []}>
				{(item) => {
					const href = props.data.children
						? `#/${[...(props.path ?? []), item].map(encodeURIComponent).join("/")}`
						: `?path=${encodeURIComponent(item)}`;
					return (
						<li class="directory-item">
							<span class="directory-icon">{getItemIcon(item)}</span>
							<a
								class="directory-link"
								href={href}
								onClick={handleClick(item)}
							>
								{item}
							</a>
						</li>
					);
				}}
			</For>
		</ul>
	);
}

export function UnknownViewer(props: { data: PreviewData }) {
	return (
		<div class="unknown-viewer">
			<p>Cannot preview <strong>{props.data.name}</strong>.</p>
			<p>Type: {props.data.type}</p>
		</div>
	);
}
