import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Locate the diff server entry for `open-in-web diff`.
 * Candidates: bundled build (dist/diff-server/serve.js), then the source tree.
 */
export function resolveDiffServer(): string | null {
	const here = import.meta.dir;
	const candidates = [
		resolve(here, "..", "..", "diff-server", "serve.js"),
		resolve(here, "..", "..", "..", "diff", "src", "serve.ts"),
	];
	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

export async function runDiffServer(args: string[]): Promise<number> {
	const entry = resolveDiffServer();
	if (!entry) {
		console.error(
			"open-in-web diff: diff server not found — run `bun run build` (builds diff/dist + dist/diff-server) or use the source tree",
		);
		return 1;
	}
	const proc = Bun.spawn({
		cmd: ["bun", entry, ...args],
		stdio: ["inherit", "inherit", "inherit"],
	});
	return proc.exited;
}
