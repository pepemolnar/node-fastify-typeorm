import { HttpError } from "../../../shared/domain/errors/http-error.js";
import { Channel, Notifier } from "../domain/notifier.js";

export class NotifierFactory {
  constructor(private readonly notifiers: Notifier[]) {}

  for(channel: Channel): Notifier {
    const notifier = this.notifiers.find((n) => n.channel === channel);
    if (!notifier) throw new HttpError(400, `Unsupported channel: ${channel}`);
    return notifier;
  }
}
