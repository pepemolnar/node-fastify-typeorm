import { describe, it, expect, vi } from "vitest";
import type { Logger } from "pino";
import { NotificationService } from "../../modules/notifications/application/notification.service.js";
import { NotifierFactory } from "../../modules/notifications/application/notifier.factory.js";
import type { Notifier } from "../../modules/notifications/domain/notifier.js";

// A single fake notifier whose send() behaviour each test controls.
function fakeNotifier(send: Notifier["send"]): Notifier {
  return { channel: "log", send };
}

// Only .error() is exercised; a stub keeps the suite free of real Pino output.
function fakeLogger(): Logger {
  return { error: vi.fn() } as unknown as Logger;
}

describe("NotificationService", () => {
  it("dispatches through the notifier the factory resolves", async () => {
    const send = vi.fn(async () => {});
    const service = new NotificationService(
      new NotifierFactory([fakeNotifier(send)]),
      fakeLogger(),
    );

    await service.notify("log", "ada@x.com", "Welcome!");

    expect(send).toHaveBeenCalledWith("ada@x.com", "Welcome!");
  });

  it("swallows a failing provider but logs the failure", async () => {
    const send = vi.fn(async () => {
      throw new Error("provider down");
    });
    const logger = fakeLogger();
    const service = new NotificationService(
      new NotifierFactory([fakeNotifier(send)]),
      logger,
    );

    // The whole reason this service exists: a down provider must not throw...
    await expect(
      service.notify("log", "ada@x.com", "Welcome!"),
    ).resolves.toBeUndefined();
    // ...but it must not vanish silently either.
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("propagates a misconfigured channel instead of swallowing it", async () => {
    const logger = fakeLogger();
    // Registry only knows "log"; asking for "email" is a bug, not an outage.
    const service = new NotificationService(
      new NotifierFactory([fakeNotifier(vi.fn(async () => {}))]),
      logger,
    );

    await expect(
      service.notify("email", "ada@x.com", "Welcome!"),
    ).rejects.toMatchObject({ status: 400 });
    expect(logger.error).not.toHaveBeenCalled();
  });
});
