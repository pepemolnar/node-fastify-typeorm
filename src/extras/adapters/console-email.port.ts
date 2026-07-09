export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}
export interface EmailAdapter {
  send(message: EmailMessage): Promise<void>;
}
