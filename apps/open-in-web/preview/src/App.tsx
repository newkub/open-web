import { createResource, createSignal, Show } from "solid-js";
import { getData, renderMarkdown } from "./render";
import {
	CodeViewer,
	CsvTable,
	DirectoryList,
	HtmlViewer,
	ImageViewer,
	JsonTree,
	PdfViewer,
	TextViewer,
	UnknownViewer,
} from "./viewers";
import "./styles.css";
import type { PreviewData } from "./types";

interface MarkdownResult {
	content: string;
	toc: string;
}

function resolveNode(
	root: PreviewData,
	segments: string[],
): PreviewData | null {
	let node = root;
	for (const segment of segments) {
		const next = node.children?.[decodeURIComponent(segment)];
		if (!next) return null;
		node = next;
	}
	return node;
}

function App() {
	const root = getData();

	const [path, setPath] = createSignal<string[]>([]);

	function readHash() {
		const raw = location.hash.replace(/^#\/?/, "").trim();
		return raw ? raw.split("/").filter(Boolean) : [];
	}

	const resolveCurrent = (segments: string[]) =>
		resolveNode(root, segments) ?? root;

	const [current, setCurrent] = createSignal<PreviewData>(
		resolveCurrent(readHash()),
	);

	const updateFromHash = () => {
		const segments = readHash();
		setPath(segments);
		setCurrent(resolveCurrent(segments));
	};

	window.addEventListener("hashchange", updateFromHash);

	const navigateTo = (name: string) => {
		const next = [...path(), name];
		location.hash = `/${next.map(encodeURIComponent).join("/")}`;
		updateFromHash();
	};

	const goHome = () => {
		location.hash = "/";
		updateFromHash();
	};

	const [theme, setTheme] = createSignal<"dark" | "light">(
		window.matchMedia?.("(prefers-color-scheme: light)").matches
			? "light"
			: "dark",
	);

	const toggleTheme = () => {
		setTheme((t) => (t === "dark" ? "light" : "dark"));
	};

	const [markdown] = createResource(
		() => (current().type === "markdown" ? current().content : null),
		async (content) => {
			const raw = await renderMarkdown(content ?? "");
			const doc = new DOMParser().parseFromString(raw, "text/html");
			const toc =
				doc.querySelector("nav.table-of-contents") ||
				doc.querySelector(".toc") ||
				doc.querySelector(".table-of-contents");
			const tocHtml = toc?.outerHTML ?? "";
			if (toc) toc.remove();
			return { content: doc.body.innerHTML, toc: tocHtml } as MarkdownResult;
		},
	);

	const data = current();

	return (
		<div class={`app app--${theme()}`} data-theme={theme()}>
			<header class="header">
				<h1>{data.name}</h1>
				<span class="meta">
					{data.type} — {data.path}
				</span>
				<button class="theme-toggle" onClick={toggleTheme} title="Toggle theme">
					{theme() === "dark" ? "☀️" : "🌙"}
				</button>
			</header>
			<Show when={path().length > 0}>
				<nav class="breadcrumb">
					<a href="#/" onClick={goHome}>
						🏠 home
					</a>
					<span class="breadcrumb-sep">/</span>
					<span class="breadcrumb-current">{data.name}</span>
				</nav>
			</Show>
			<main class="main">
				<Show when={data.type === "markdown" && markdown()?.toc}>
					<aside class="toc" innerHTML={markdown()?.toc ?? ""} />
				</Show>
				<article class={`content type-${data.type}`}>
					{data.type === "markdown" && (
						<Show
							when={!markdown.loading}
							fallback={<div class="loading">Rendering markdown...</div>}
						>
							<div
								class="markdown-body"
								innerHTML={markdown()?.content ?? ""}
							/>
						</Show>
					)}
					{data.type === "code" && <CodeViewer data={data} />}
					{data.type === "html" && <HtmlViewer data={data} />}
					{data.type === "image" && <ImageViewer data={data} />}
					{data.type === "pdf" && <PdfViewer data={data} />}
					{data.type === "csv" && <CsvTable data={data} />}
					{data.type === "json" && <JsonTree data={data} />}
					{data.type === "text" && <TextViewer data={data} />}
					{data.type === "directory" && (
						<DirectoryList
							data={data}
							onOpen={navigateTo}
							path={path()}
						/>
					)}
					{data.type === "unknown" && <UnknownViewer data={data} />}
				</article>
			</main>
		</div>
	);
}

export default App;
