# Public Leads Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public, anonymous-access `POST /public/leads` endpoint to the CRM API that lets the (statically-exported) Armadura Collection website submit a consultation request without exposing any of the CRM's authenticated internal API.

**Architecture:** A new, self-contained `PublicModule` with one REST controller (bypasses auth via `@AllowAnonymous()`, rate-limited, JSON body parsing scoped only to this route since the app disables the global body parser), one service that upserts a `Contact` and appends an `Activity` (type `NOTE`) with the inquiry message, both owned by a fixed "website leads" user configured via env var. Deliberately does **not** create a `Deal` — the Prisma `Deal` model requires a `companyId`, which a cold public lead never has.

**Tech Stack:** NestJS (existing `apps/api`), Prisma (`@crm/db`), `class-validator` (matches the app's existing global `ValidationPipe`), `@nestjs/throttler` (new dependency, for anti-spam rate limiting), `bun:test` + `supertest` (existing test stack).

## Global Constraints

- Endpoint path: `POST /public/leads` (from the design spec).
- Must not require authentication (public website visitors call it directly from the browser).
- Must only be able to *create* data — no read, update, or delete capability of any existing CRM data.
- Must not touch the app-wide `bodyParser: false` setting in `create-app.ts` — scope JSON parsing to this route only.
- Rate limiting required (anti-spam, per spec's Risks section).

---

### Task 1: Add the rate-limiting dependency

**Files:**
- Modify: `apps/api/package.json`

**Interfaces:**
- Produces: `@nestjs/throttler` package available to import in Task 3.

- [ ] **Step 1: Install the package**

Run from the repo root:
```bash
cd apps/api
bun add @nestjs/throttler
```

- [ ] **Step 2: Verify it installed**

Run: `grep '"@nestjs/throttler"' package.json`
Expected: a line like `"@nestjs/throttler": "^6.x.x",` under `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json apps/api/bun.lock
git commit -m "chore(api): add @nestjs/throttler for public-endpoint rate limiting"
```

---

### Task 2: Add the `WEBSITE_LEAD_OWNER_ID` environment variable

**Files:**
- Modify: `apps/api/src/config/env.validation.ts`
- Modify: `.env.example` (repo root)

**Interfaces:**
- Produces: `EnvironmentVariables.WEBSITE_LEAD_OWNER_ID: string` — the `User.id` that public-lead Contacts and Activities are attributed to. Consumed by the service in Task 5.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/config/env.validation.spec.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { validateEnv } from "./env.validation";

const baseEnv = {
	DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/crm",
	BETTER_AUTH_SECRET: "a".repeat(32),
	ALLOWED_SIGN_IN: "example.com",
};

describe("validateEnv", () => {
	it("rejects a config missing WEBSITE_LEAD_OWNER_ID", () => {
		expect(() => validateEnv(baseEnv)).toThrow(/WEBSITE_LEAD_OWNER_ID/);
	});

	it("accepts a config with WEBSITE_LEAD_OWNER_ID set", () => {
		const result = validateEnv({
			...baseEnv,
			WEBSITE_LEAD_OWNER_ID: "usr-abc123",
		});
		expect(result.WEBSITE_LEAD_OWNER_ID).toBe("usr-abc123");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test src/config/env.validation.spec.ts`
Expected: FAIL — first test fails because `WEBSITE_LEAD_OWNER_ID` isn't validated yet (no throw), second fails because the property doesn't exist.

- [ ] **Step 3: Add the field to `EnvironmentVariables`**

In `apps/api/src/config/env.validation.ts`, add alongside the other `@IsString()` fields (e.g. near `BETTER_AUTH_SECRET`):

```typescript
	@IsString()
	@MinLength(1, {
		message:
			"WEBSITE_LEAD_OWNER_ID is required. Set it to the User.id that public website leads should be attributed to.",
	})
	WEBSITE_LEAD_OWNER_ID!: string;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test src/config/env.validation.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Document the new variable**

Add to `.env.example` (repo root), near the other required variables:

```
# User.id that public website leads (consultation requests) are attributed to
# as owner/author. Find a real user id with:
#   docker compose run --rm wpcli ... (n/a — this is the CRM, not WordPress)
#   psql "$DATABASE_URL" -c 'select id, email from "user" limit 5;'
WEBSITE_LEAD_OWNER_ID=""
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/config/env.validation.ts apps/api/src/config/env.validation.spec.ts .env.example
git commit -m "feat(api): add required WEBSITE_LEAD_OWNER_ID env var"
```

---

### Task 3: Create the `CreateLeadDto`

**Files:**
- Create: `apps/api/src/public/dto/create-lead.dto.ts`
- Test: `apps/api/src/public/dto/create-lead.dto.spec.ts`

**Interfaces:**
- Produces: `class CreateLeadDto { name: string; email: string; message: string; locale?: string; sourceUrl?: string }` — consumed by the controller (Task 6) and service (Task 5).

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/public/dto/create-lead.dto.spec.ts
import { describe, expect, it } from "bun:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateLeadDto } from "./create-lead.dto";

describe("CreateLeadDto", () => {
	it("passes with valid input", async () => {
		const dto = plainToInstance(CreateLeadDto, {
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "I would like to request a consultation for Armadura.",
			locale: "en",
			sourceUrl: "https://eloysjeans.com/en",
		});
		const errors = await validate(dto);
		expect(errors).toHaveLength(0);
	});

	it("fails when name is empty", async () => {
		const dto = plainToInstance(CreateLeadDto, {
			name: "",
			email: "ada@example.com",
			message: "Hello",
		});
		const errors = await validate(dto);
		expect(errors.some((e) => e.property === "name")).toBe(true);
	});

	it("fails with an invalid email", async () => {
		const dto = plainToInstance(CreateLeadDto, {
			name: "Ada",
			email: "not-an-email",
			message: "Hello",
		});
		const errors = await validate(dto);
		expect(errors.some((e) => e.property === "email")).toBe(true);
	});

	it("fails when message is empty", async () => {
		const dto = plainToInstance(CreateLeadDto, {
			name: "Ada",
			email: "ada@example.com",
			message: "",
		});
		const errors = await validate(dto);
		expect(errors.some((e) => e.property === "message")).toBe(true);
	});

	it("allows locale and sourceUrl to be omitted", async () => {
		const dto = plainToInstance(CreateLeadDto, {
			name: "Ada",
			email: "ada@example.com",
			message: "Hello",
		});
		const errors = await validate(dto);
		expect(errors).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test src/public/dto/create-lead.dto.spec.ts`
Expected: FAIL with "Cannot find module './create-lead.dto'"

- [ ] **Step 3: Write the DTO**

```typescript
// apps/api/src/public/dto/create-lead.dto.ts
import {
	IsEmail,
	IsOptional,
	IsString,
	IsUrl,
	MaxLength,
	MinLength,
} from "class-validator";

export class CreateLeadDto {
	@IsString()
	@MinLength(1, { message: "Name is required." })
	@MaxLength(200)
	name!: string;

	@IsEmail({}, { message: "That is not a valid email address." })
	@MaxLength(320)
	email!: string;

	@IsString()
	@MinLength(1, { message: "Message is required." })
	@MaxLength(5000)
	message!: string;

	@IsOptional()
	@IsString()
	@MaxLength(10)
	locale?: string;

	@IsOptional()
	@IsUrl({ require_tld: false })
	@MaxLength(500)
	sourceUrl?: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test src/public/dto/create-lead.dto.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/public/dto/create-lead.dto.ts apps/api/src/public/dto/create-lead.dto.spec.ts
git commit -m "feat(api): add CreateLeadDto for the public leads endpoint"
```

---

### Task 4: Write the `PublicLeadsService`

**Files:**
- Create: `apps/api/src/public/public-leads.service.ts`
- Test: `apps/api/src/public/public-leads.service.spec.ts`

**Interfaces:**
- Consumes: `CreateLeadDto` (Task 3), `Db` from `@crm/db` via `InjectDatabase` (existing, see `../database/database.constants`), `process.env.WEBSITE_LEAD_OWNER_ID` (Task 2).
- Produces: `class PublicLeadsService { submit(input: CreateLeadDto): Promise<{ contactId: string; activityId: string }> }` — consumed by the controller (Task 6).

- [ ] **Step 1: Write the failing test**

This is a unit test against a fake `Db` — it does not need a real Postgres connection.

```typescript
// apps/api/src/public/public-leads.service.spec.ts
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { PublicLeadsService } from "./public-leads.service";

function fakeDb() {
	const contact = {
		findFirst: mock(async () => null as { id: string } | null),
		create: mock(async () => ({ id: "contact-1" })),
	};
	const activity = {
		create: mock(async () => ({ id: "activity-1" })),
	};
	return { contact, activity } as unknown as import("@crm/db").Db;
}

describe("PublicLeadsService", () => {
	let db: ReturnType<typeof fakeDb>;
	let service: PublicLeadsService;
	const ownerId = "usr-owner";

	beforeEach(() => {
		db = fakeDb();
		service = new PublicLeadsService(db, ownerId);
	});

	it("creates a new contact and a NOTE activity when no contact exists for the email", async () => {
		const result = await service.submit({
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "Please contact me about Armadura.",
			locale: "en",
			sourceUrl: "https://eloysjeans.com/en",
		});

		expect(db.contact.create).toHaveBeenCalledTimes(1);
		expect(db.activity.create).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ contactId: "contact-1", activityId: "activity-1" });

		const createArgs = db.contact.create.mock.calls[0][0];
		expect(createArgs.data.email).toBe("ada@example.com");
		expect(createArgs.data.ownerId).toBe(ownerId);
	});

	it("reuses an existing contact and only adds a new activity", async () => {
		db.contact.findFirst = mock(async () => ({ id: "contact-existing" }));

		const result = await service.submit({
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "Second inquiry.",
		});

		expect(db.contact.create).not.toHaveBeenCalled();
		expect(db.activity.create).toHaveBeenCalledTimes(1);
		expect(result.contactId).toBe("contact-existing");

		const activityArgs = db.activity.create.mock.calls[0][0];
		expect(activityArgs.data.contactId).toBe("contact-existing");
		expect(activityArgs.data.body).toBe("Second inquiry.");
	});

	it("splits the submitted name into firstName/lastName on the new contact", async () => {
		await service.submit({
			name: "Ada Lovelace",
			email: "ada@example.com",
			message: "Hi",
		});

		const createArgs = db.contact.create.mock.calls[0][0];
		expect(createArgs.data.firstName).toBe("Ada");
		expect(createArgs.data.lastName).toBe("Lovelace");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && bun test src/public/public-leads.service.spec.ts`
Expected: FAIL with "Cannot find module './public-leads.service'"

- [ ] **Step 3: Write the service**

```typescript
// apps/api/src/public/public-leads.service.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && bun test src/public/public-leads.service.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/public/public-leads.service.ts apps/api/src/public/public-leads.service.spec.ts
git commit -m "feat(api): add PublicLeadsService (contact upsert + NOTE activity)"
```

---

### Task 5: Write the `PublicLeadsController`

**Files:**
- Create: `apps/api/src/public/public-leads.controller.ts`

**Interfaces:**
- Consumes: `PublicLeadsService.submit()` (Task 4), `CreateLeadDto` (Task 3), `@AllowAnonymous` from `@thallesp/nestjs-better-auth` (existing, see `health.controller.ts`).
- Produces: `POST /public/leads` route, registered by `PublicModule` (Task 6).

- [ ] **Step 1: Write the controller**

No standalone unit test for this file — its behavior is covered by the module-level e2e test in Task 7, which is the meaningful boundary (real HTTP request in, real response out).

```typescript
// apps/api/src/public/public-leads.controller.ts
import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { PublicLeadsService } from "./public-leads.service";

@Controller("public/leads")
export class PublicLeadsController {
	constructor(private readonly leads: PublicLeadsService) {}

	@Post()
	@HttpCode(201)
	@AllowAnonymous()
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	async create(@Body() body: CreateLeadDto) {
		const result = await this.leads.submit(body);
		return { status: "ok", ...result };
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/public/public-leads.controller.ts
git commit -m "feat(api): add PublicLeadsController (POST /public/leads)"
```

---

### Task 6: Wire up `PublicModule` (scoped body parsing, throttler, module registration)

**Files:**
- Create: `apps/api/src/public/public.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `PublicLeadsController` (Task 5), `PublicLeadsService` + `WEBSITE_LEAD_OWNER_ID` token (Task 4), `ThrottlerModule` from `@nestjs/throttler` (Task 1).
- Produces: `PublicModule`, imported by `AppModule`. This is the task that makes the route actually reachable.

- [ ] **Step 1: Write the module**

This scopes `express.json()` to only the `public/leads` path — the app's global `bodyParser: false` (in `create-app.ts`) stays untouched for every other route.

```typescript
// apps/api/src/public/public.module.ts
import { json } from "express";
import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
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
export class PublicModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(json()).forRoutes(PublicLeadsController);
	}
}
```

- [ ] **Step 2: Register it in `AppModule`**

In `apps/api/src/app.module.ts`, add the import and add `PublicModule` to the `imports` array (near `HealthModule`, since both are unauthenticated-route modules):

```typescript
import { PublicModule } from "./public/public.module";
```

```typescript
		HealthModule,
		PublicModule,
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/public/public.module.ts apps/api/src/app.module.ts
git commit -m "feat(api): register PublicModule with scoped body parsing and rate limiting"
```

---

### Task 7: End-to-end test for `POST /public/leads`

**Files:**
- Create: `apps/api/test/public-leads.e2e.spec.ts`

**Interfaces:**
- Consumes: `AppModule` (existing), the full stack wired up by Tasks 1–6.
- Requires: a running Postgres reachable at `DATABASE_URL` (`docker compose up -d` from the repo's `deploy` setup — see the CRM's own README) and a real `User.id` for `WEBSITE_LEAD_OWNER_ID`. Follows the exact env-fallback pattern already used in `test/auth.e2e.spec.ts`.

- [ ] **Step 1: Write the test**

```typescript
// apps/api/test/public-leads.e2e.spec.ts
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";

const fallback = (key: string, value: string) => {
	if (!process.env[key]) {
		process.env[key] = value;
	}
};

fallback(
	"DATABASE_URL",
	"postgresql://postgres:postgres@localhost:5432/crm?schema=public",
);
fallback("BETTER_AUTH_SECRET", "test-secret-at-least-32-characters-long");
fallback("API_URL", "http://localhost:3001");
fallback("ALLOWED_SIGN_IN", "example.com");
fallback("GOOGLE_CLIENT_ID", "test-google-client-id");
fallback("GOOGLE_CLIENT_SECRET", "test-google-client-secret");
// Replace with a real seeded user id in your local DB before running.
fallback("WEBSITE_LEAD_OWNER_ID", "usr-jvaf9ztwmi");

describe("Public leads (e2e)", () => {
	let app: INestApplication;

	beforeAll(async () => {
		const { AppModule } = await import("../src/app.module");

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication({ bodyParser: false });
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it("creates a lead with a valid payload and returns 201", async () => {
		const uniqueEmail = `test-${Date.now()}@example.com`;

		const response = await request(app.getHttpServer())
			.post("/public/leads")
			.send({
				name: "Test Visitor",
				email: uniqueEmail,
				message: "I would like a consultation for Armadura Collection.",
				locale: "en",
				sourceUrl: "https://eloysjeans.com/en",
			})
			.expect(201);

		expect(response.body.status).toBe("ok");
		expect(typeof response.body.contactId).toBe("string");
		expect(typeof response.body.activityId).toBe("string");
	});

	it("rejects a payload with no message", async () => {
		await request(app.getHttpServer())
			.post("/public/leads")
			.send({ name: "Test", email: "test2@example.com", message: "" })
			.expect(400);
	});

	it("rejects an invalid email", async () => {
		await request(app.getHttpServer())
			.post("/public/leads")
			.send({ name: "Test", email: "not-an-email", message: "Hi" })
			.expect(400);
	});

	it("does not require authentication", async () => {
		const response = await request(app.getHttpServer())
			.post("/public/leads")
			.send({
				name: "Anon",
				email: `anon-${Date.now()}@example.com`,
				message: "No auth header sent.",
			});

		expect(response.status).not.toBe(401);
	});
});
```

- [ ] **Step 2: Run the test**

Requires Postgres running (`docker compose up -d` in `deploy/`) and `WEBSITE_LEAD_OWNER_ID` set to a real user id from your database:
```bash
psql "$DATABASE_URL" -c 'select id from "user" limit 1;'
```

Run: `cd apps/api && bun test test/public-leads.e2e.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/public-leads.e2e.spec.ts
git commit -m "test(api): add e2e coverage for POST /public/leads"
```

---

## Self-Review Notes

- **Spec coverage:** endpoint path ✓ (Task 5), create-only/no read-update-delete ✓ (service only ever calls `findFirst`/`create`, never `update`/`delete`), no auth required ✓ (`@AllowAnonymous`, tested in Task 7), rate limiting ✓ (Task 1 + 6), doesn't touch global `bodyParser` ✓ (Task 6 scopes `json()` to the controller only).
- **Deviation from the design spec's literal wording** ("crea un contacto/deal nuevo"): this plan creates a `Contact` + `Activity`, not a `Deal` — the `Deal` model requires `companyId` (required, not nullable), which a cold public lead never has. Flagged here for the user to confirm before Task 4 executes; the design spec's Risks section already anticipated this kind of scoping refinement.
