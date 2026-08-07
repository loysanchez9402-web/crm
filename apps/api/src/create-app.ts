import { auth } from "@crm/auth";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
	ExpressAdapter,
	type NestExpressApplication,
} from "@nestjs/platform-express";
import { json } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { ContextLogger } from "./logging/context-logger";
import { publicLeadsCors } from "./public/public-leads.cors";

export function createValidationPipe(): ValidationPipe {
	return new ValidationPipe({
		whitelist: true,
		forbidNonWhitelisted: true,
		transform: true,
		transformOptions: { enableImplicitConversion: true },
	});
}

export async function createApp(): Promise<NestExpressApplication> {
	const app = await NestFactory.create<NestExpressApplication>(
		AppModule,
		new ExpressAdapter(),
		{ bodyParser: false, logger: new ContextLogger() },
	);

	// Registered here, ahead of everything else on the Express stack, so its
	// own OPTIONS handling always wins the preflight for this one route --
	// see disableTrustedOriginsCors in app.module.ts and the comment in
	// public-leads.cors.ts for why this can't be a Nest-level module
	// middleware instead.
	app.use("/public/leads", publicLeadsCors, json());

	// Everything else keeps exactly the CORS policy Better Auth would have
	// set up itself (see disableTrustedOriginsCors in app.module.ts): the
	// app's own trusted origins, credentialed.
	app.enableCors({
		origin: auth.options.trustedOrigins,
		methods: ["GET", "POST", "PUT", "DELETE"],
		credentials: true,
	});

	app.use(helmet());
	app.useGlobalPipes(createValidationPipe());

	return app;
}
