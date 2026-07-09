export interface UserRegistered {
  type: "UserRegistered";
  userId: string;
  email: string;
  name: string;
  occurredAt: Date;
}
export type DomainEvent = UserRegistered;
