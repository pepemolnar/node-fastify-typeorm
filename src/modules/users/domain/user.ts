import { randomUUID } from "node:crypto";
import { AggregateRoot } from "../../../shared/domain/aggregate-root.js";
import { Email } from "./value.objects/email.js";
import { PasswordHash } from "./value.objects/password-hash.js";
import { UserRegistered } from "./events/user-registered.js";

export type Role = "user" | "admin";

export interface UserSnapshot {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

interface NewUserInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

interface UserProps {
  name: string;
  email: Email;
  role: Role;
  passwordHash: PasswordHash;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends AggregateRoot<string, UserRegistered> {
  private constructor(
    id: string,
    private props: UserProps,
  ) {
    super(id);
  }

  static create(input: NewUserInput): Promise<User> {
    return User.build(input);
  }

  static async register(input: NewUserInput): Promise<User> {
    const user = await User.build(input);
    const event: UserRegistered = {
      type: "UserRegistered",
      userId: user.id,
      email: user.email,
      name: user.name,
      occurredAt: user.createdAt,
    };
    user.addDomainEvent(event);
    return user;
  }

  static reconstitute(props: {
    id: string;
    name: string;
    email: string;
    role: Role;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(props.id, {
      name: props.name,
      email: Email.create(props.email),
      role: props.role,
      passwordHash: PasswordHash.fromHash(props.passwordHash),
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  private static async build(input: NewUserInput): Promise<User> {
    const now = new Date();
    return new User(randomUUID(), {
      name: User.normalizeName(input.name),
      email: Email.create(input.email),
      role: input.role ?? "user",
      passwordHash: await PasswordHash.fromPlain(input.password),
      createdAt: now,
      updatedAt: now,
    });
  }

  rename(name: string): void {
    this.props.name = User.normalizeName(name);
    this.touch();
  }

  changeEmail(email: string): void {
    this.props.email = Email.create(email);
    this.touch();
  }

  async changePassword(plain: string): Promise<void> {
    this.props.passwordHash = await PasswordHash.fromPlain(plain);
    this.touch();
  }

  verifyPassword(plain: string): Promise<boolean> {
    return this.props.passwordHash.verify(plain);
  }

  get name(): string {
    return this.props.name;
  }
  get email(): string {
    return this.props.email.value;
  }
  get role(): Role {
    return this.props.role;
  }
  get passwordHash(): string {
    return this.props.passwordHash.value;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  private static normalizeName(name: string): string {
    return name.trim().replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
