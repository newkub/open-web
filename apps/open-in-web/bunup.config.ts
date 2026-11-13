import { defineConfig } from "bunup";

export default defineConfig({
	entry: ["./src/index.ts", "./src/presentation/cli/cli.ts"],
	format: ["esm", "cjs"],
	dts: true,
	splitting: true,
	clean: true,
	exports: true,
	external: ["playwright-core"],
});
