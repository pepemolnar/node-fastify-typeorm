import type { Logger } from "pino";
import type { NotifierFactory } from "./notifier.factory.js";
import type { Channel } from "../domain/notifier.js";

export class NotificationService {
  constructor(
    private notifiers: NotifierFactory,
    private logger: Logger,
  ) {}

  async notify(channel: Channel, to: string, message: string): Promise<void> {
    const notifier = this.notifiers.for(channel);

    try {
      await notifier.send(to, message);
    } catch (err) {
      this.logger.error({ err, channel, to }, "notification delivery failed");
    }
  }
}
