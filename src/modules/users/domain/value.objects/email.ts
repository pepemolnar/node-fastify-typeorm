import { HttpError } from "../../../../shared/domain/errors/http-error.js";
import { ValueObject } from "../../../../shared/domain/value-object.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new HttpError(
        400,
        `Invalid email address: ${raw}`,
        "INVALID_EMAIL",
      );
    }
    return new Email(normalized);
  }

  toString(): string {
    return this.value;
  }
}
