import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { validateEnv } from "./env.validation";

function baseConfig(overrides: Record<string, unknown> = {}) {
	return {
		DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/crm",
		BETTER_AUTH_SECRET: "a".repeat(32),
		ALLOWED_SIGN_IN: "example.com",
		...overrides,
	};
}

describe("APP_URL validation", () => {
	it("accepts a single http(s) origin", () => {
		expect(() =>
			validateEnv(baseConfig({ APP_URL: "http://localhost:3000" })),
		).not.toThrow();
	});

	it("accepts a comma-separated list of origins", () => {
		expect(() =>
			validateEnv(
				baseConfig({
					APP_URL: "http://localhost:3000, https://app.example.com",
				}),
			),
		).not.toThrow();
	});

	it("is optional and can be omitted entirely", () => {
		expect(() => validateEnv(baseConfig())).not.toThrow();
	});

	it("rejects a bare wildcard", () => {
		expect(() => validateEnv(baseConfig({ APP_URL: "*" }))).toThrow();
	});

	it("rejects an empty or whitespace-only value", () => {
		expect(() => validateEnv(baseConfig({ APP_URL: "" }))).toThrow();
		expect(() => validateEnv(baseConfig({ APP_URL: "   " }))).toThrow();
	});

	it("rejects a value with no protocol", () => {
		expect(() => validateEnv(baseConfig({ APP_URL: "localhost:3000" }))).toThrow();
	});

	it("rejects a non-http(s) protocol", () => {
		expect(() =>
			validateEnv(baseConfig({ APP_URL: "ftp://example.com" })),
		).toThrow();
	});

	it("rejects the list if any single origin is invalid", () => {
		expect(() =>
			validateEnv(baseConfig({ APP_URL: "http://localhost:3000,*" })),
		).toThrow();
	});
});
