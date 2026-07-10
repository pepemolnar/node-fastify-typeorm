import type { Logger } from "pino";
import { Notifier } from "../domain/notifier.js";

export class LogNotifier implements Notifier {
  readonly channel = "log" as const;
  constructor(private logger: Logger) {}
  async send(to: string, message: string) {
    this.logger.info({ channel: this.channel, to }, message);
  }
}
