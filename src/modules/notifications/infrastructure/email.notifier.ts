import { Notifier } from "../domain/notifier.js";

export class EmailNotifier implements Notifier {
  readonly channel = "email" as const;
  async send(_to: string, _message: string) {}
}
