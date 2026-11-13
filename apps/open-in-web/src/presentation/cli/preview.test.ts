import { describe, expect, it } from "bun:test";
import { inferType } from "./preview";

describe("preview type inference", () => {
	it("classifies markdown extensions", () => {
		expect(inferType(".md")).toBe("markdown");
		expect(inferType(".markdown")).toBe("markdown");
	});

	it("classifies html extensions", () => {
		expect(inferType(".html")).toBe("html");
		expect(inferType(".htm")).toBe("html");
	});

	it("classifies image extensions", () => {
		expect(inferType(".png")).toBe("image");
		expect(inferType(".jpg")).toBe("image");
		expect(inferType(".svg")).toBe("image");
	});

	it("classifies document extensions", () => {
		expect(inferType(".pdf")).toBe("pdf");
		expect(inferType(".csv")).toBe("csv");
		expect(inferType(".json")).toBe("json");
	});

	it("classifies code extensions", () => {
		expect(inferType(".ts")).toBe("code");
		expect(inferType(".tsx")).toBe("code");
		expect(inferType(".py")).toBe("code");
		expect(inferType(".rs")).toBe("code");
		expect(inferType(".dockerfile")).toBe("code");
	});

	it("classifies unknown or plain text extensions as text", () => {
		expect(inferType(".txt")).toBe("text");
		expect(inferType(".unknown")).toBe("text");
	});

	it("classifies log files as code", () => {
		expect(inferType(".log")).toBe("code");
	});
});
