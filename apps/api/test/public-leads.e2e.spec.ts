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

const testRunId = process.env.TEST_RUN_ID ?? "public-leads-e2e";
const websiteLeadOwnerId = `user-${testRunId}`;

describe("Public leads (e2e)", () => {
	let app: INestApplication;
	let ownerCreated = false;

	beforeAll(async () => {
		const { db } = await import("@crm/db");

		try {
			// Delete dependents before the user row -- a previous run that crashed
			// before its own cleanup ran (see afterAll) can leave Activity/Contact
			// rows pointing at this same id, and Activity.createdById is RESTRICT,
			// so deleting the user alone would throw here too.
			await db.activity.deleteMany({
				where: { createdById: websiteLeadOwnerId },
			});
			await db.contact.deleteMany({ where: { ownerId: websiteLeadOwnerId } });
			await db.user.deleteMany({ where: { id: websiteLeadOwnerId } });
			await db.user.create({
				data: {
					id: websiteLeadOwnerId,
					name: "Public Leads Test Owner",
					email: `${websiteLeadOwnerId}@example.test`,
				},
			});
			ownerCreated = true;
		} catch {
			// No reachable Postgres in this environment -- the app below will fail
			// to boot for the same reason, which is the same outcome as before this
			// seeding was added.
		}

		process.env.WEBSITE_LEAD_OWNER_ID = websiteLeadOwnerId;

		const { AppModule } = await import("../src/app.module");
		const { createValidationPipe } = await import("../src/create-app");

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication({ bodyParser: false });
		app.useGlobalPipes(createValidationPipe());
		await app.init();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}

		if (ownerCreated) {
			const { db } = await import("@crm/db");
			try {
				// Delete dependents before the owner row: Activity.createdById has no
				// onDelete override, so it's RESTRICT by default, and deleting the
				// user first (as this cleanup originally did) throws a foreign-key
				// violation on every run that actually creates a lead -- silently,
				// since it lands in the catch below, leaving the user, its
				// contacts and its activities all behind instead of cleaned up.
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

		expect(response.body).toEqual({ status: "ok" });
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
