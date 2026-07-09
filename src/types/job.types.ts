export const SEND_EMAIL = "send-email" as const;
export interface SendEmailJob {
  to: string;
  template: "welcome";
  context: { name: string };
}
