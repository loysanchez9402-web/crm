import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { validateEnv } from "./env.validation";

const baseEnv = {
	DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/crm",
	BETTER_AUTH_SECRET: "a".repeat(32),
	ALLOWED_SIGN_IN: "example.com",
};

describe("validateEnv", () => {
	it("rejects a config missing WEBSITE_LEAD_OWNER_ID", () => {
		expect(() => validateEnv(baseEnv)).toThrow(/WEBSITE_LEAD_OWNER_ID/);
	});

	it("accepts a config with WEBSITE_LEAD_OWNER_ID set", () => {
		const result = validateEnv({
			...baseEnv,
			WEBSITE_LEAD_OWNER_ID: "usr-abc123",
		});
		expect(result.WEBSITE_LEAD_OWNER_ID).toBe("usr-abc123");
	});
});
