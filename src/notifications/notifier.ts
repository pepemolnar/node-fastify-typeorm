import { HttpError } from "../middlewares/errorHandler.js";
import { Channel, Notifier } from "../types/notification.types.js";

export class NotifierFactory {
  constructor(private readonly notifiers: Notifier[]) {}

  for(channel: Channel): Notifier {
    const n = this.notifiers.find((x) => x.channel === channel);
    if (!n) throw new HttpError(400, `Unsupported channel: ${channel}`);
    return n;
  }
}
export { Channel, Notifier };
