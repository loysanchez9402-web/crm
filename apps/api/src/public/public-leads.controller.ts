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
		const result = await this.leads.submit(body);
		return { status: "ok", ...result };
	}
}
