import { describe, it, expect } from "vitest";
import { NotifierFactory } from "../../extras/notifications/notifier.js";
import { EmailNotifier } from "../../extras/notifications/email.notifier.js";
import { SmsNotifier } from "../../extras/notifications/sms.notifier.js";
import { LogNotifier } from "../../extras/notifications/log.notifier.js";

function factory() {
  return new NotifierFactory([
    new EmailNotifier(),
    new SmsNotifier(),
    new LogNotifier(),
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
    const f = new NotifierFactory([new LogNotifier()]);
    expect(() => f.for("email")).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });
});
