import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
	ExpressAdapter,
	type NestExpressApplication,
} from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { ContextLogger } from "./logging/context-logger";

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

	app.use(helmet());
	app.useGlobalPipes(createValidationPipe());

	return app;
}
