import { Notifier } from "./notifier.js";

export class EmailNotifier implements Notifier {
  readonly channel = "email" as const;
  async send(_to: string, _message: string) {
    // TODO: Implement e.g. sendgrid
  }
}
