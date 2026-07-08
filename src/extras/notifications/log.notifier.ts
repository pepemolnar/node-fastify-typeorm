import { Notifier } from "./notifier.js";

export class LogNotifier implements Notifier {
  readonly channel = "log" as const;
  async send(_to: string, _message: string) {
    // TODO: implement job
  }
}
