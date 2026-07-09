import type { Logger } from "pino";
import { DomainEvent } from "../../types/event.types.js";

type Handler<E extends DomainEvent> = (event: E) => Promise<void> | void;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent["type"]>(
    type: T,
    handler: Handler<Extract<DomainEvent, { type: T }>>,
  ): void;
}

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Handler<DomainEvent>[]>();
  constructor(private logger: Logger) {}

  subscribe<T extends DomainEvent["type"]>(
    type: T,
    handler: Handler<Extract<DomainEvent, { type: T }>>,
  ): void {
    const list = this.handlers.get(type) ?? [];
    // The map is keyed by string, so it can't preserve the per-type handler
    // signature — widen on insert. `publish` only ever calls a handler with an
    // event whose `type` matches the key, so this is sound.
    list.push(handler as Handler<DomainEvent>);
    this.handlers.set(type, list);
  }

  async publish(event: DomainEvent): Promise<void> {
    for (const handler of this.handlers.get(event.type) ?? []) {
      try {
        await handler(event);
      } catch (err) {
        this.logger.error({ err, type: event.type }, "event handler failed");
      }
    }
  }
}
