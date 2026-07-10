import bcrypt from "bcrypt";
import { ValueObject } from "../../../../shared/domain/value-object.js";

const SALT_ROUNDS = 10;

export class PasswordHash extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  static async fromPlain(plain: string): Promise<PasswordHash> {
    return new PasswordHash(await bcrypt.hash(plain, SALT_ROUNDS));
  }

  static fromHash(hash: string): PasswordHash {
    return new PasswordHash(hash);
  }

  verify(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.value);
  }

  toString(): string {
    return this.value;
  }
}
