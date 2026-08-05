import {
	type MiddlewareConsumer,
	Module,
	type NestModule,
	RequestMethod,
} from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import type { NextFunction, Request, Response } from "express";
import { json } from "express";
import { PublicLeadsController } from "./public-leads.controller";
import {
	PublicLeadsService,
	WEBSITE_LEAD_OWNER_ID,
} from "./public-leads.service";

// Scoped CORS for POST /public/leads only -- Better Auth's own CORS
// (packages/auth/src/env.ts) covers /api/auth/* and friends and is
// deliberately left alone. Without WEBSITE_ORIGIN set, no
// Access-Control-Allow-Origin header is sent and the route stays closed to
// browser callers from any origin, matching the pre-CORS behavior.
function publicLeadsCors(req: Request, res: Response, next: NextFunction) {
	const origin = process.env.WEBSITE_ORIGIN;
	if (origin) {
		res.setHeader("Access-Control-Allow-Origin", origin);
	}
	res.setHeader("Access-Control-Allow-Methods", "POST");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");

	if (req.method === "OPTIONS") {
		res.status(204).end();
		return;
	}

	next();
}

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
export class PublicModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		// RequestMethod.ALL (not the PublicLeadsController class) so this also
		// matches OPTIONS: Nest's middleware matcher restricts a controller-class
		// target to the HTTP methods it actually declares (POST only here), which
		// would silently skip the CORS middleware -- and therefore the preflight
		// handling below -- for a browser's preflight OPTIONS request.
		consumer.apply(publicLeadsCors, json()).forRoutes({
			path: "public/leads",
			method: RequestMethod.ALL,
		});
	}
}
