import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";

const fallback = (key: string, value: string) => {
	if (!process.env[key]) {
		process.env[key] = value;
	}
};

fallback(
	"DATABASE_URL",
	"postgresql://postgres:postgres@localhost:5432/crm?schema=public",
);
fallback("BETTER_AUTH_SECRET", "test-secret-at-least-32-characters-long");
fallback("API_URL", "http://localhost:3001");
fallback("ALLOWED_SIGN_IN", "example.com");
fallback("GOOGLE_CLIENT_ID", "test-google-client-id");
fallback("GOOGLE_CLIENT_SECRET", "test-google-client-secret");
// Replace with a real seeded user id in your local DB before running.
fallback("WEBSITE_LEAD_OWNER_ID", "usr-jvaf9ztwmi");

describe("Public leads (e2e)", () => {
	let app: INestApplication;

	beforeAll(async () => {
		const { AppModule } = await import("../src/app.module");

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication({ bodyParser: false });
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it("creates a lead with a valid payload and returns 201", async () => {
		const uniqueEmail = `test-${Date.now()}@example.com`;

		const response = await request(app.getHttpServer())
			.post("/public/leads")
			.send({
				name: "Test Visitor",
				email: uniqueEmail,
				message: "I would like a consultation for Armadura Collection.",
				locale: "en",
				sourceUrl: "https://eloysjeans.com/en",
			})
			.expect(201);

		expect(response.body.status).toBe("ok");
		expect(typeof response.body.contactId).toBe("string");
		expect(typeof response.body.activityId).toBe("string");
	});

	it("rejects a payload with no message", async () => {
		await request(app.getHttpServer())
			.post("/public/leads")
			.send({ name: "Test", email: "test2@example.com", message: "" })
			.expect(400);
	});

	it("rejects an invalid email", async () => {
		await request(app.getHttpServer())
			.post("/public/leads")
			.send({ name: "Test", email: "not-an-email", message: "Hi" })
			.expect(400);
	});

	it("does not require authentication", async () => {
		const response = await request(app.getHttpServer())
			.post("/public/leads")
			.send({
				name: "Anon",
				email: `anon-${Date.now()}@example.com`,
				message: "No auth header sent.",
			});

		expect(response.status).not.toBe(401);
	});
});
