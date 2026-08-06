import type { Db } from "@crm/db";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ActivityStampService } from "../crm/activity-stamp.service";
import type { ConversionService } from "../currency/conversion.service";
import { DealsService } from "./deals.service";

function fakeDb() {
	const txDealUpdate = mock(async (_args: unknown) => ({
		id: "deal-1",
		name: "Acme deal",
	}));
	const queryRaw = mock(async (..._args: unknown[]) => [
		{ amount: null, currency: "USD" },
	]);
	const tx = { deal: { update: txDealUpdate }, $queryRaw: queryRaw };
	const transaction = mock(
		async (callback: (client: typeof tx) => unknown) => callback(tx),
	);
	const dealUpdate = mock(async (_args: unknown) => ({
		id: "deal-1",
		name: "Acme deal",
	}));

	return {
		deal: { update: dealUpdate },
		$transaction: transaction,
		tx,
	};
}

function fakeConversion() {
	return {
		dealFields: mock(async (..._args: unknown[]) => ({
			baseAmount: null,
			baseCurrency: null,
			fxRate: null,
			fxRateAt: null,
		})),
	};
}

describe("DealsService.update", () => {
	let db: ReturnType<typeof fakeDb>;
	let conversion: ReturnType<typeof fakeConversion>;
	let service: DealsService;

	beforeEach(() => {
		db = fakeDb();
		conversion = fakeConversion();
		service = new DealsService(
			db as unknown as Db,
			{} as ActivityStampService,
			conversion as unknown as ConversionService,
		);
	});

	it("updates a non-money field directly, without opening a transaction", async () => {
		await service.update("deal-1", { name: "New name" });

		expect(db.$transaction).not.toHaveBeenCalled();
		expect(db.deal.update).toHaveBeenCalledTimes(1);
	});

	it("locks the row with FOR UPDATE inside a transaction when amount or currency changes", async () => {
		await service.update("deal-1", { amountCents: 5000 });

		expect(db.$transaction).toHaveBeenCalledTimes(1);
		expect(db.tx.$queryRaw).toHaveBeenCalledTimes(1);
		expect(db.tx.deal.update).toHaveBeenCalledTimes(1);
		expect(db.deal.update).not.toHaveBeenCalled();
	});

	it("passes the open transaction's client into ConversionService.dealFields, not the plain db", async () => {
		await service.update("deal-1", { currency: "EUR" });

		expect(conversion.dealFields).toHaveBeenCalledTimes(1);
		const call = conversion.dealFields.mock.calls[0]!;
		expect(call[2]).toBe(db.tx);
	});
});
