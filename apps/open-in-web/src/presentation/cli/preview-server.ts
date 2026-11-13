import { extname, resolve } from "node:path";
import open from "open";
import { inferType } from "./file-types";
import { buildPreviewData, injectDataScript } from "./preview-data";

export async function servePreview(
	previewDir: string,
	baseDir: string,
	indexPath: string,
	html: string,
	noOpen?: boolean,
): Promise<string> {
	const server = Bun.serve({
		port: 0,
		async fetch(req) {
			const url = new URL(req.url);

			if (url.pathname.startsWith("/raw/")) {
				const rawName = decodeURIComponent(url.pathname.slice(5));
				const rawPath = resolve(baseDir, rawName);
				if (!rawPath.startsWith(baseDir)) {
					return new Response("not allowed", { status: 403 });
				}
				const file = Bun.file(rawPath);
				if (!(await file.exists())) {
					return new Response("not found", { status: 404 });
				}
				const ext = extname(rawPath).slice(1).toLowerCase();
				const isText =
					inferType(ext) !== "image" && inferType(ext) !== "pdf";
				return new Response(file, {
					headers: isText
						? { "Content-Type": `text/plain; charset=utf-8` }
						: {},
				});
			}

			if (url.pathname === "/") {
				const subPath = url.searchParams.get("path");
				if (subPath) {
					const targetPath = resolve(baseDir, subPath);
					if (!targetPath.startsWith(baseDir)) {
						return new Response("not allowed", { status: 403 });
					}
					try {
						const subData = await buildPreviewData(targetPath, { baseDir, static: false });
						const subHtml = injectDataScript(html, subData);
						return new Response(subHtml, {
							headers: { "Content-Type": "text/html; charset=utf-8" },
						});
					} catch {
						return new Response("not found", { status: 404 });
					}
				}
				const file = Bun.file(indexPath);
				return new Response(file, {
					headers: { "Content-Type": "text/html; charset=utf-8" },
				});
			}

			const fileName = decodeURIComponent(url.pathname.slice(1));
			const filePath = resolve(previewDir, fileName);
			if (!filePath.startsWith(previewDir)) {
				return new Response("not allowed", { status: 403 });
			}
			const file = Bun.file(filePath);
			if (!(await file.exists())) {
				return new Response("not found", { status: 404 });
			}
			// guess text vs asset — text files need explicit utf-8 or
			// the browser sniffs and garbles non-ASCII
			const ext = extname(filePath).slice(1).toLowerCase();
			const textExts = new Set(["css", "js", "json", "txt", "map", "html"]);
			if (textExts.has(ext)) {
				const type =
					ext === "css"
						? "text/css"
						: ext === "js"
							? "text/javascript"
							: ext === "json" || ext === "map"
								? "application/json"
								: "text/plain";
				return new Response(file, {
					headers: { "Content-Type": `${type}; charset=utf-8` },
				});
			}
			return new Response(file);
		},
	});

	const serverUrl = server.url.href;

	const stop = () => {
		try {
			server.stop(true);
		} catch {
			// already stopped
		}
	};

	process.on("SIGINT", stop);
	process.on("SIGTERM", stop);
	process.on("exit", stop);

	console.log(`Preview server: ${serverUrl}`);

	if (noOpen) {
		return serverUrl;
	}

	await open(serverUrl);

	return serverUrl;
}
