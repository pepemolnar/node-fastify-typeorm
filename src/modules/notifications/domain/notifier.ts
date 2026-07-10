export type Channel = "email" | "sms" | "log";

export interface Notifier {
  readonly channel: Channel;
  send(to: string, message: string): Promise<void>;
}
