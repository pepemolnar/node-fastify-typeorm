import type { Logger } from "pino";
import type { EmailAdapter, EmailMessage } from "../application/email.port.js";

export class ConsoleEmailAdapter implements EmailAdapter {
  constructor(private logger: Logger) {}
  async send(message: EmailMessage): Promise<void> {
    this.logger.info({ email: message }, "email sent (console)");
  }
}
