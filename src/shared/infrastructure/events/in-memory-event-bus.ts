import type { Logger } from "pino";
import { DomainEvent } from "../../domain/events/domain-event.js";
import { EventBus, EventHandler } from "../../domain/events/event-bus.js";

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, EventHandler<DomainEvent>[]>();
  constructor(private logger: Logger) {}

  subscribe<E extends DomainEvent>(
    type: E["type"],
    handler: EventHandler<E>,
  ): void {
    const list = this.handlers.get(type) ?? [];

    list.push(handler as EventHandler<DomainEvent>);
    this.handlers.set(type, list);
  }

  async publish<E extends DomainEvent>(event: E): Promise<void> {
    for (const handler of this.handlers.get(event.type) ?? []) {
      try {
        await handler(event);
      } catch (err) {
        this.logger.error({ err, type: event.type }, "event handler failed");
      }
    }
  }
}
