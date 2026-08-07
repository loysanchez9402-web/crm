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
