import { auth } from "@crm/auth";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { ActivitiesModule } from "./activities/activities.module";
import { AuthModule } from "./auth/auth.module";
import { BackfillModule } from "./backfill/backfill.module";
import { AppCacheModule } from "./cache/cache.module";
import { CompaniesModule } from "./companies/companies.module";
import { validateEnv } from "./config/env.validation";
import { ContactsModule } from "./contacts/contacts.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { CrmModule } from "./crm/crm.module";
import { CurrencyModule } from "./currency/currency.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DatabaseModule } from "./database/database.module";
import { DealsModule } from "./deals/deals.module";
import { GoogleModule } from "./google/google.module";
import { HealthModule } from "./health/health.module";
import { LoggingModule } from "./logging/logging.module";
import { logAuthRoute } from "./logging/request-logger.middleware";
import { PublicModule } from "./public/public.module";
import { SearchModule } from "./search/search.module";
import { SettingsModule } from "./settings/settings.module";
import { SsoModule } from "./sso/sso.module";
import { TelemetryModule } from "./telemetry/telemetry.module";
import { TrpcModule } from "./trpc/trpc.module";
import { UsersModule } from "./users/users.module";
import { WorkspaceModule } from "./workspace/workspace.module";

@Module({
	imports: [
		LoggingModule,
		ConfigModule.forRoot({
			isGlobal: true,
			cache: true,
			validate: validateEnv,
		}),
		AppCacheModule,
		DatabaseModule,
		CrmModule,
		BetterAuthModule.forRoot({
			auth,
			middleware: logAuthRoute,
			// create-app.ts calls app.enableCors() itself, ahead of
			// publicLeadsCors on the Express stack, with the same origin/
			// credentials config this would otherwise set up -- see the
			// comment there.
			disableTrustedOriginsCors: true,
		}),
		AuthModule,
		HealthModule,
		PublicModule,
		TrpcModule,
		UsersModule,
		CompaniesModule,
		ContactsModule,
		ConversationsModule,
		CurrencyModule,
		DealsModule,
		ActivitiesModule,
		DashboardModule,
		SearchModule,
		GoogleModule,
		SettingsModule,
		WorkspaceModule,
		SsoModule,
		BackfillModule,
		TelemetryModule,
	],
})
export class AppModule {}
