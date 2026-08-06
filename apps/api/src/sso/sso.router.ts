import { Inject } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import { Ctx, Input, Mutation, Query, Router } from "nestjs-trpc";
import type { z } from "zod";
import type { AuthedTrpcContext, BaseTrpcContext } from "../trpc/context.types";
import {
	deleteSsoProviderInput,
	registerSsoProviderInput,
	ssoProviderListInput,
} from "./sso.contracts";
import { SsoService } from "./sso.service";

function headersOf(ctx: BaseTrpcContext): Headers {
	return fromNodeHeaders(ctx.req?.headers ?? {});
}

@Router({ alias: "sso" })
export class SsoRouter {
	constructor(@Inject(SsoService) private readonly sso: SsoService) {}

	@Query()
	async signInOptions() {
		return this.sso.signInOptions();
	}

	@Query()
	async settings(@Ctx() ctx: AuthedTrpcContext) {
		return this.sso.settings(ctx.user.id);
	}

	@Query({ input: ssoProviderListInput })
	async list(@Input() input: z.infer<typeof ssoProviderListInput>) {
		return this.sso.list(input);
	}

	@Mutation({ input: registerSsoProviderInput })
	async register(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof registerSsoProviderInput>,
	) {
		return this.sso.register(ctx.user.id, headersOf(ctx), input);
	}

	@Mutation({ input: deleteSsoProviderInput })
	async remove(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof deleteSsoProviderInput>,
	) {
		return this.sso.remove(ctx.user.id, headersOf(ctx), input);
	}
}
