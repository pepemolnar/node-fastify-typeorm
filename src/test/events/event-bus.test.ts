import { describe, it, expect, vi } from "vitest";
import type { Logger } from "pino";
import { InMemoryEventBus } from "../../extras/events/event-bus.js";

function fakeLogger(): Logger {
  return { error: vi.fn() } as unknown as Logger;
}

const userRegistered = {
  type: "UserRegistered",
  userId: "u1",
  email: "ada@x.com",
  name: "Ada",
  occurredAt: new Date("2020-01-01"),
} as const;

describe("InMemoryEventBus", () => {
  it("delivers an event to every handler subscribed to its type", async () => {
    const bus = new InMemoryEventBus(fakeLogger());
    const first = vi.fn();
    const second = vi.fn();
    bus.subscribe("UserRegistered", first);
    bus.subscribe("UserRegistered", second);

    await bus.publish(userRegistered);

    expect(first).toHaveBeenCalledWith(userRegistered);
    expect(second).toHaveBeenCalledWith(userRegistered);
  });

  it("isolates handler failures so one throw doesn't stop the rest", async () => {
    const logger = fakeLogger();
    const bus = new InMemoryEventBus(logger);
    const boom = vi.fn(() => {
      throw new Error("handler blew up");
    });
    const survivor = vi.fn();
    bus.subscribe("UserRegistered", boom);
    bus.subscribe("UserRegistered", survivor);

    await bus.publish(userRegistered);

    expect(survivor).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalled();
  });

  it("does nothing when no handler is subscribed", async () => {
    const bus = new InMemoryEventBus(fakeLogger());
    await expect(bus.publish(userRegistered)).resolves.toBeUndefined();
  });
});
