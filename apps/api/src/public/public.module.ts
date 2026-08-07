import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { PublicLeadsController } from "./public-leads.controller";
import {
	PublicLeadsService,
	WEBSITE_LEAD_OWNER_ID,
} from "./public-leads.service";

@Module({
	imports: [
		ThrottlerModule.forRoot({
			throttlers: [{ ttl: 60_000, limit: 5 }],
		}),
	],
	controllers: [PublicLeadsController],
	providers: [
		PublicLeadsService,
		{
			provide: WEBSITE_LEAD_OWNER_ID,
			useFactory: () => {
				const id = process.env.WEBSITE_LEAD_OWNER_ID;
				if (!id) {
					throw new Error(
						"WEBSITE_LEAD_OWNER_ID is not set — see .env.example.",
					);
				}
				return id;
			},
		},
	],
})
export class PublicModule {}
