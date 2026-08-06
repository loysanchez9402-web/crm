import type { Db } from "@crm/db";
import { Prisma } from "@crm/db";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { PublicLeadsService } from "./public-leads.service";

type ContactCreateInput = {
	data: { firstName: string; lastName?: string; email: string; ownerId: string };
};
type ActivityCreateInput = {
	data: { contactId: string; body: string };
};

function fakeDb() {
	const contact = {
		findFirst: mock(async (_args: unknown) => null as { id: string } | null),
		create: mock(async (_args: ContactCreateInput) => ({ id: "contact-1" })),
	};
	const activity = {
		create: mock(async (_args: ActivityCreateInput) => ({ id: "activity-1" })),
	};
	return { contact, activity };
}

describe("PublicLeadsService", () => {
	let db: ReturnType<typeof fakeDb>;
	let service: PublicLeadsService;
	const ownerId = "usr-owner";

	beforeEach(() => {
		db = fakeDb();
		service = new PublicLeadsService(db as unknown as Db, ownerId);
	});

	it("creates a new contact and a NOTE activity when no contact exists for the email", async () => {
		const result = await service.submit({
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "Please contact me about Armadura.",
			locale: "en",
			sourceUrl: "https://eloysjeans.com/en",
		});

		expect(db.contact.create).toHaveBeenCalledTimes(1);
		expect(db.activity.create).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ contactId: "contact-1", activityId: "activity-1" });

		const createArgs = db.contact.create.mock.calls[0]![0];
		expect(createArgs.data.email).toBe("ada@example.com");
		expect(createArgs.data.ownerId).toBe(ownerId);
	});

	it("reuses an existing contact and only adds a new activity", async () => {
		db.contact.findFirst = mock(async () => ({ id: "contact-existing" }));

		const result = await service.submit({
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "Second inquiry.",
		});

		expect(db.contact.create).not.toHaveBeenCalled();
		expect(db.activity.create).toHaveBeenCalledTimes(1);
		expect(result.contactId).toBe("contact-existing");

		const activityArgs = db.activity.create.mock.calls[0]![0];
		expect(activityArgs.data.contactId).toBe("contact-existing");
		expect(activityArgs.data.body).toBe("Second inquiry.");
	});

	it("recovers from a concurrent duplicate-email race by reusing the winning contact", async () => {
		// Simulates two simultaneous submissions for the same email: both pass the
		// initial findFirst check (no contact exists yet), then this request loses
		// the race and its create() hits the email @unique constraint (P2002). The
		// service should re-fetch and reuse the contact the other request created,
		// rather than propagating the error.
		let findFirstCalls = 0;
		db.contact.findFirst = mock(async () => {
			findFirstCalls += 1;
			if (findFirstCalls === 1) return null;
			return { id: "contact-race-winner" };
		});
		db.contact.create = mock(async () => {
			throw new Prisma.PrismaClientKnownRequestError(
				"Unique constraint failed on the fields: (`email`)",
				{ code: "P2002", clientVersion: "6.0.0" },
			);
		});

		const result = await service.submit({
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "Concurrent submission.",
		});

		expect(db.contact.create).toHaveBeenCalledTimes(1);
		expect(db.contact.findFirst).toHaveBeenCalledTimes(2);
		expect(result.contactId).toBe("contact-race-winner");
		expect(db.activity.create).toHaveBeenCalledTimes(1);

		const activityArgs = db.activity.create.mock.calls[0]![0];
		expect(activityArgs.data.contactId).toBe("contact-race-winner");
	});

	it("splits the submitted name into firstName/lastName on the new contact", async () => {
		await service.submit({
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "Hi",
		});

		const createArgs = db.contact.create.mock.calls[0]![0];
		expect(createArgs.data.firstName).toBe("Ada");
		expect(createArgs.data.lastName).toBe("Lovelace");
	});
});
