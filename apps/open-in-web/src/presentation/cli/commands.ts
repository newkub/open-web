import { existsSync } from "node:fs";
import { Command } from "commander";
import { createBrowserAdapter } from "#adapters/browser";
import { createOpenUrlUseCase } from "../../modules/open-web";
import { previewFile } from "./preview";
import { runDiffServer } from "./diff";

function isUrl(value: string): boolean {
	return /^https?:\/\//.test(value) || value.startsWith("file://");
}

const openTarget = async (
	input: string,
	options: { browser?: string; open?: boolean; static?: boolean },
): Promise<void> => {
	// Local file/directory -> preview site, URL -> open directly
	if (!isUrl(input) && existsSync(input)) {
		try {
			const result = await previewFile(input, {
				noOpen: options.open === false,
				static: options.static === true,
			});
			console.log(`Preview: ${result}`);
		} catch (error) {
			console.error("Failed to preview:", error instanceof Error ? error.message : String(error));
			process.exit(1);
		}
		return;
	}

	const adapter = createBrowserAdapter();
	const openUrl = createOpenUrlUseCase(adapter);

	const result = await openUrl({
		url: input,
		browser: options.browser as
			| "chrome"
			| "firefox"
			| "safari"
			| "edge"
			| "default"
			| undefined,
	});

	if (result.success) {
		console.log(result.message);
	} else {
		console.error("Failed to open URL:", result.message);
		process.exit(1);
	}
};

export const createCli = (): Command => {
	const program = new Command();

	program
		.name("open-in-web")
		.alias("ofw")
		.description("Open files, directories, URLs, and diffs in a web browser")
		.version("1.0.0")
		.argument("[path]", "URL or local file/directory path to open")
		.option("-b, --browser <browser>", "Browser to use")
		.option("-s, --static", "Single self-contained HTML in temp (default is localhost website)")
		.option("--no-open", "Generate preview without opening the browser")
		.action(async (input, options) => {
			if (!input) {
				console.error("Error: URL or path is required");
				process.exit(1);
			}
			await openTarget(input, options);
		});

	program
		.command("open <path>")
		.description("Open a file or directory on the preview website")
		.option("-b, --browser <browser>", "Browser to use")
		.option("-s, --static", "Single self-contained HTML in temp (default is localhost website)")
		.option("--no-open", "Generate preview without opening the browser")
		.action(async (target, options) => {
			await openTarget(target, options);
		});

	program
		.command("preview <path>")
		.description("Alias of `open` — render a file/directory on the preview website")
		.option("-s, --static", "Single self-contained HTML in temp (default is localhost website)")
		.option("--no-open", "Generate preview without opening the browser")
		.action(async (target, options) => {
			await openTarget(target, options);
		});

	program
		.command("diff [args...]")
		.description(
			"Diff viewer — code diffs (pr/git/branch/file) and UI diffs between two URLs; forwards to the diff server",
		)
		.allowUnknownOption()
		.allowExcessArguments()
		.action(async (args: string[]) => {
			const code = await runDiffServer(args);
			process.exit(code);
		});

	return program;
};
