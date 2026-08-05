import { beforeEach, describe, expect, it, mock } from "bun:test";
import { PublicLeadsService } from "./public-leads.service";

function fakeDb() {
	const contact = {
		findFirst: mock(async () => null as { id: string } | null),
		create: mock(async () => ({ id: "contact-1" })),
	};
	const activity = {
		create: mock(async () => ({ id: "activity-1" })),
	};
	return { contact, activity } as unknown as import("@crm/db").Db;
}

describe("PublicLeadsService", () => {
	let db: ReturnType<typeof fakeDb>;
	let service: PublicLeadsService;
	const ownerId = "usr-owner";

	beforeEach(() => {
		db = fakeDb();
		service = new PublicLeadsService(db, ownerId);
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

		const createArgs = db.contact.create.mock.calls[0][0];
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

		const activityArgs = db.activity.create.mock.calls[0][0];
		expect(activityArgs.data.contactId).toBe("contact-existing");
		expect(activityArgs.data.body).toBe("Second inquiry.");
	});

	it("splits the submitted name into firstName/lastName on the new contact", async () => {
		await service.submit({
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "Hi",
		});

		const createArgs = db.contact.create.mock.calls[0][0];
		expect(createArgs.data.firstName).toBe("Ada");
		expect(createArgs.data.lastName).toBe("Lovelace");
	});
});
