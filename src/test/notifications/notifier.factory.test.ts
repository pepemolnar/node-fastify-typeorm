import { describe, it, expect } from "vitest";
import type { Logger } from "pino";
import { NotifierFactory } from "../../modules/notifications/application/notifier.factory.js";
import { EmailNotifier } from "../../modules/notifications/infrastructure/email.notifier.js";
import { SmsNotifier } from "../../modules/notifications/infrastructure/sms.notifier.js";
import { LogNotifier } from "../../modules/notifications/infrastructure/log.notifier.js";

const noopLogger = { info: () => {} } as unknown as Logger;

function factory() {
  return new NotifierFactory([
    new EmailNotifier(),
    new SmsNotifier(),
    new LogNotifier(noopLogger),
  ]);
}

describe("NotifierFactory", () => {
  it("returns the notifier registered for each channel", () => {
    const f = factory();
    // Each concrete notifier must own the channel it claims — this is what
    // guards against the copy-paste 'channel' mislabel.
    expect(f.for("email")).toBeInstanceOf(EmailNotifier);
    expect(f.for("sms")).toBeInstanceOf(SmsNotifier);
    expect(f.for("log")).toBeInstanceOf(LogNotifier);
  });

  it("throws a 400 for a channel with no registered notifier", () => {
    const f = new NotifierFactory([new LogNotifier(noopLogger)]);
    expect(() => f.for("email")).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });
});
