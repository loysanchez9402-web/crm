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
