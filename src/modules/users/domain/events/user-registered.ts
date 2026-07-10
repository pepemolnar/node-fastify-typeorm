import { DomainEvent } from "../../../../shared/domain/events/domain-event.js";

export interface UserRegistered extends DomainEvent {
  type: "UserRegistered";
  userId: string;
  email: string;
  name: string;
}
