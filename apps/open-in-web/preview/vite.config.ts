import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
	plugins: [solid()],
	root: "preview",
	base: "./",
	build: {
		outDir: "../dist/preview",
		emptyOutDir: true,
		rollupOptions: {
			output: {
				format: "iife",
				inlineDynamicImports: true,
			},
		},
	},
});
