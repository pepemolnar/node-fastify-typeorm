import { Notifier } from "./notifier.js";

export class SmsNotifier implements Notifier {
  readonly channel = "sms" as const;
  async send(_to: string, _message: string) {
    // TODO: implement e.g. Twilio
  }
}
