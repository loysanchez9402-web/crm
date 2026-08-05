import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { PublicLeadsService } from "./public-leads.service";

@Controller("public/leads")
export class PublicLeadsController {
	constructor(private readonly leads: PublicLeadsService) {}

	@Post()
	@HttpCode(201)
	@AllowAnonymous()
	@UseGuards(ThrottlerGuard)
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	async create(@Body() body: CreateLeadDto) {
		// PublicLeadsService.submit() returns { contactId, activityId }, useful
		// internally and for tests, but an anonymous caller has no legitimate use
		// for internal CRM record ids -- and Contact.id leaks creation-time-
		// adjacent information about whether an email was already a known
		// contact. Don't forward it.
		await this.leads.submit(body);
		return { status: "ok" };
	}
}
