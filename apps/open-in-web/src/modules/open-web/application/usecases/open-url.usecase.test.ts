import { describe, expect, it } from "bun:test";
import { createOpenUrlUseCase } from "./open-url.usecase";
import type { IOpenUrlPorts } from "../../ports";

const createMockPorts = (shouldFail = false): IOpenUrlPorts => ({
	openUrl: async () => {
		if (shouldFail) throw new Error("failed to open");
	},
	getPlatform: () => "win32",
});

describe("open-url usecase", () => {
	it("opens an https URL", async () => {
		const usecase = createOpenUrlUseCase(createMockPorts());
		const result = await usecase({ url: "https://example.com" });

		expect(result.success).toBe(true);
		expect(result.url).toBe("https://example.com");
	});

	it("opens a local file path as file://", async () => {
		const usecase = createOpenUrlUseCase(createMockPorts());
		const result = await usecase({ url: "C:\\test.md" });

		expect(result.success).toBe(true);
		expect(result.url).toMatch(/^file:\/\/\//);
	});

	it("opens a file:// URL unchanged", async () => {
		const usecase = createOpenUrlUseCase(createMockPorts());
		const result = await usecase({ url: "file:///C:/test.md" });

		expect(result.success).toBe(true);
		expect(result.url).toBe("file:///C:/test.md");
	});

	it("returns failure for empty input", async () => {
		const usecase = createOpenUrlUseCase(createMockPorts());
		const result = await usecase({ url: "" });

		expect(result.success).toBe(false);
	});

	it("returns failure when the adapter throws", async () => {
		const usecase = createOpenUrlUseCase(createMockPorts(true));
		const result = await usecase({ url: "https://example.com" });

		expect(result.success).toBe(false);
		expect(result.message).toBe("failed to open");
	});
});
