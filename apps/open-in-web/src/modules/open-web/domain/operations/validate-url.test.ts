import { describe, expect, it } from "bun:test";
import { normalizeUrl, validateUrl } from "./validate-url";

describe("validate-url", () => {
	describe("validateUrl", () => {
		it("returns false for empty or whitespace-only input", () => {
			expect(validateUrl("")).toBe(false);
			expect(validateUrl("   ")).toBe(false);
		});

		it("returns true for any non-empty string", () => {
			expect(validateUrl("https://example.com")).toBe(true);
			expect(validateUrl("test.md")).toBe(true);
		});
	});

	describe("normalizeUrl", () => {
		it("keeps http(s) URLs unchanged", () => {
			expect(normalizeUrl("https://example.com")).toBe("https://example.com");
			expect(normalizeUrl("http://localhost:3000")).toBe("http://localhost:3000");
		});

		it("keeps file:// URLs unchanged", () => {
			expect(normalizeUrl("file:///C:/test.md")).toBe("file:///C:/test.md");
		});

		it("converts an absolute Windows path to file://", () => {
			const result = normalizeUrl("C:\\test.md");
			expect(result).toMatch(/^file:\/\/\/C:\/test.md$/);
		});

		it("converts a relative path to a file:// URL", () => {
			const result = normalizeUrl("test.md");
			expect(result).toMatch(/^file:\/\/\//);
		});

		it("converts a directory to a file:// URL", () => {
			const result = normalizeUrl("dir");
			expect(result).toMatch(/^file:\/\/\//);
		});
	});
});
