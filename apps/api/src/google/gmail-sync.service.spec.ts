import { describe, expect, it, mock } from "bun:test";
import type { Db, MailboxSyncModel as MailboxSync } from "@crm/db";
import type { ActivityStampService } from "../crm/activity-stamp.service";
import type { GmailMessage } from "./gmail.client";
import { GmailSyncService } from "./gmail-sync.service";
import type { MatchContext } from "./google-match.service";

const SENT_AT = new Date("2026-08-01T12:00:00.000Z");

function fakeMessage(): GmailMessage {
	return {
		id: "gmail-msg-1",
		internalDate: String(SENT_AT.getTime()),
		payload: {
			headers: [
				{ name: "Message-Id", value: "<msg-1@example.com>" },
				{ name: "From", value: "Ada Lovelace <ada@example.com>" },
				{ name: "Subject", value: "Hello" },
			],
		},
	};
}

function fakeRow(): MailboxSync {
	return {
		id: "sync-1",
		userId: "user-1",
		autoCreate: true,
	} as MailboxSync;
}

function fakeContext(): MatchContext {
	return {
		ourAddresses: new Set(),
		ourDomains: new Set(),
		suppressedDomains: new Set(),
		suppressedEmails: new Set(),
	};
}

function fakeDb(queryRawResult: unknown[]) {
	const activityUpsert = mock(async (_args: unknown) => ({
		createdAt: new Date(),
	}));
	const queryRaw = mock(async (..._args: unknown[]) => queryRawResult);

	return {
		emailMessage: {
			findUnique: mock(async (_args: unknown) => null),
			create: mock(async (_args: unknown) => ({ id: "message-1" })),
		},
		emailThread: {
			findUnique: mock(async (_args: unknown) => ({
				id: "thread-1",
				companyId: "company-1",
				contactId: null,
			})),
			upsert: mock(async (_args: unknown) => ({
				id: "thread-1",
				firstMessageAt: new Date(0),
				lastMessageAt: new Date(0),
			})),
		},
		activity: { upsert: activityUpsert },
		$queryRaw: queryRaw,
	};
}

function callStore(
	service: GmailSyncService,
	row: MailboxSync,
	mailbox: string,
	message: GmailMessage,
	context: MatchContext,
) {
	type StoreMethod = (
		row: MailboxSync,
		mailbox: string,
		message: GmailMessage,
		context: MatchContext,
	) => Promise<boolean>;
	return (service as unknown as { store: StoreMethod }).store(
		row,
		mailbox,
		message,
		context,
	);
}

describe("GmailSyncService.store", () => {
	it("recomputes the thread rollup with a single atomic UPDATE, using its RETURNING lastMessageAt", async () => {
		const db = fakeDb([
			{ firstMessageAt: new Date(0), lastMessageAt: SENT_AT },
		]);
		const stamp = { touch: mock(async (..._args: unknown[]) => undefined) };
		const service = new GmailSyncService(
			db as unknown as Db,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			stamp as unknown as ActivityStampService,
		);

		const wrote = await callStore(
			service,
			fakeRow(),
			"user@example.com",
			fakeMessage(),
			fakeContext(),
		);

		expect(wrote).toBe(true);
		expect(db.$queryRaw).toHaveBeenCalledTimes(1);
		const activityArgs = db.activity.upsert.mock.calls[0]?.[0] as {
			create: { occurredAt: Date };
		};
		expect(activityArgs.create.occurredAt).toEqual(SENT_AT);
	});

	it("falls back to the parsed message's sentAt when the atomic UPDATE matches no row", async () => {
		const db = fakeDb([]);
		const stamp = { touch: mock(async (..._args: unknown[]) => undefined) };
		const service = new GmailSyncService(
			db as unknown as Db,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			stamp as unknown as ActivityStampService,
		);

		await callStore(
			service,
			fakeRow(),
			"user@example.com",
			fakeMessage(),
			fakeContext(),
		);

		const activityArgs = db.activity.upsert.mock.calls[0]?.[0] as {
			create: { occurredAt: Date };
		};
		expect(activityArgs.create.occurredAt).toEqual(SENT_AT);
	});
});
