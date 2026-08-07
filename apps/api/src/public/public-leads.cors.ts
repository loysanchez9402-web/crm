import type { NextFunction, Request, Response } from "express";

// Scoped CORS for POST /public/leads only, registered directly on the raw
// Express app in create-app.ts -- ahead of Better Auth's own app-wide
// enableCors() (see disableTrustedOriginsCors in app.module.ts). Better
// Auth's CORS answers every OPTIONS preflight itself before any Nest-level,
// route-scoped middleware gets a chance to run, so this can't be wired
// through PublicModule's MiddlewareConsumer -- it has to run first on the
// Express stack itself. Without WEBSITE_ORIGIN set, no
// Access-Control-Allow-Origin header is sent and the route stays closed to
// browser callers from any origin, matching the pre-CORS behavior.
export function publicLeadsCors(
	req: Request,
	res: Response,
	next: NextFunction,
) {
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
