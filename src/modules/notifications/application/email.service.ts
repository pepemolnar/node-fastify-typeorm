import { EmailAdapter } from "./email.port.js";

export class EmailService {
  constructor(private provider: EmailAdapter) {}

  async sendWelcome(to: string, name: string): Promise<void> {
    await this.provider.send({
      to,
      subject: "Welcome!",
      html: `<p>Hi ${name}, thanks for registering.</p>`,
    });
  }
}
