#!/usr/bin/env bun
import { createCli } from "./index";

const main = async () => {
	const cli = createCli();
	await cli.parse();
};

main().catch((err) => {
	console.error("Error:", err);
	process.exit(1);
});
