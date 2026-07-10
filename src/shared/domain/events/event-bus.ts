import { DomainEvent } from "./domain-event.js";

export type EventHandler<E extends DomainEvent> = (
  event: E,
) => Promise<void> | void;

export interface EventBus {
  publish<E extends DomainEvent>(event: E): Promise<void>;
  subscribe<E extends DomainEvent>(
    type: E["type"],
    handler: EventHandler<E>,
  ): void;
}
