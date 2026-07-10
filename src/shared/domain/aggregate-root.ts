import { Entity } from "./entity.js";
import { DomainEvent } from "./events/domain-event.js";

export abstract class AggregateRoot<
  Id,
  E extends DomainEvent = DomainEvent,
> extends Entity<Id> {
  private domainEvents: E[] = [];

  protected addDomainEvent(event: E): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): E[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }
}
