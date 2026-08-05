import type { Db } from "@crm/db";
import { Inject, Injectable } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import type { CreateLeadDto } from "./dto/create-lead.dto";

export const WEBSITE_LEAD_OWNER_ID = Symbol("WEBSITE_LEAD_OWNER_ID");

function splitName(fullName: string): { firstName: string; lastName?: string } {
	const trimmed = fullName.trim();
	const spaceIndex = trimmed.indexOf(" ");
	if (spaceIndex === -1) {
		return { firstName: trimmed };
	}
	return {
		firstName: trimmed.slice(0, spaceIndex),
		lastName: trimmed.slice(spaceIndex + 1).trim() || undefined,
	};
}

@Injectable()
export class PublicLeadsService {
	constructor(
		@InjectDatabase() private readonly db: Db,
		@Inject(WEBSITE_LEAD_OWNER_ID) private readonly ownerId: string,
	) {}

	async submit(
		input: CreateLeadDto,
	): Promise<{ contactId: string; activityId: string }> {
		const email = input.email.trim().toLowerCase();

		const existing = await this.db.contact.findFirst({
			where: { email: { equals: email, mode: "insensitive" } },
			select: { id: true },
		});

		let contactId: string;
		if (existing) {
			contactId = existing.id;
		} else {
			const { firstName, lastName } = splitName(input.name);
			const created = await this.db.contact.create({
				data: {
					firstName,
					lastName,
					email,
					ownerId: this.ownerId,
				},
			});
			contactId = created.id;
		}

		const subject = input.sourceUrl
			? `Website consultation request (${input.locale ?? "?"}) — ${input.sourceUrl}`
			: `Website consultation request (${input.locale ?? "?"})`;

		const activity = await this.db.activity.create({
			data: {
				type: "NOTE",
				subject,
				body: input.message.trim(),
				contactId,
				createdById: this.ownerId,
				occurredAt: new Date(),
			},
		});

		return { contactId, activityId: activity.id };
	}
}
