import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { INestApplication } from "@nestjs/common";
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
process.env.WEBSITE_ORIGIN = "https://eloysjeans.com";

const websiteLeadOwnerId = "usr-public-leads-cors-e2e";
process.env.WEBSITE_LEAD_OWNER_ID = websiteLeadOwnerId;

// This suite boots the app through the real createApp() bootstrap -- not
// through Test.createTestingModule() like the other e2e suites -- because
// the bug it guards against only exists on that exact path: Better Auth's
// AuthModule answers every CORS preflight itself before Nest-level,
// route-scoped middleware (the pattern PublicModule used to use) ever runs,
// so a scoped CORS policy for one route has to be wired directly onto the
// Express app in create-app.ts to have any effect on a real preflight.
describe("Public leads CORS (e2e, real bootstrap)", () => {
	let app: INestApplication;
	let ownerCreated = false;

	beforeAll(async () => {
		const { db } = await import("@crm/db");

		try {
			await db.activity.deleteMany({
				where: { createdById: websiteLeadOwnerId },
			});
			await db.contact.deleteMany({ where: { ownerId: websiteLeadOwnerId } });
			await db.user.deleteMany({ where: { id: websiteLeadOwnerId } });
			await db.user.create({
				data: {
					id: websiteLeadOwnerId,
					name: "Public Leads CORS Test Owner",
					email: `${websiteLeadOwnerId}@example.test`,
				},
			});
			ownerCreated = true;
		} catch {
			// No reachable Postgres in this environment -- the app below will fail
			// to boot for the same reason.
		}

		const { createApp } = await import("../src/create-app");
		app = await createApp();
		await app.init();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}

		if (ownerCreated) {
			const { db } = await import("@crm/db");
			try {
				await db.activity.deleteMany({
					where: { createdById: websiteLeadOwnerId },
				});
				await db.contact.deleteMany({
					where: { ownerId: websiteLeadOwnerId },
				});
				await db.user.deleteMany({ where: { id: websiteLeadOwnerId } });
			} catch {
				// Best-effort cleanup; nothing to do if the DB is unreachable.
			}
		}
	});

	it("answers the preflight for WEBSITE_ORIGIN with a matching Access-Control-Allow-Origin", async () => {
		const response = await request(app.getHttpServer())
			.options("/public/leads")
			.set("Origin", "https://eloysjeans.com")
			.set("Access-Control-Request-Method", "POST")
			.expect(204);

		expect(response.headers["access-control-allow-origin"]).toBe(
			"https://eloysjeans.com",
		);
	});

	it("never reflects an arbitrary origin's own value back on the preflight", async () => {
		const response = await request(app.getHttpServer())
			.options("/public/leads")
			.set("Origin", "https://attacker.example")
			.set("Access-Control-Request-Method", "POST")
			.expect(204);

		expect(response.headers["access-control-allow-origin"]).not.toBe(
			"https://attacker.example",
		);
	});

	it("carries the same Access-Control-Allow-Origin on the actual POST response", async () => {
		const response = await request(app.getHttpServer())
			.post("/public/leads")
			.set("Origin", "https://eloysjeans.com")
			.send({
				name: "CORS Regression",
				email: `cors-regression-${Date.now()}@example.com`,
				message: "Confirms the preflight and the real request agree.",
			})
			.expect(201);

		expect(response.headers["access-control-allow-origin"]).toBe(
			"https://eloysjeans.com",
		);
	});
});
