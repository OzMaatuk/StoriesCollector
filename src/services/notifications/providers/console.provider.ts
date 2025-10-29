import { NotificationPayload, NotificationProvider } from './types';

export class ConsoleProvider implements NotificationProvider {
  readonly type: 'email' | 'sms';

  constructor(type: 'email' | 'sms') {
    this.type = type;
  }

  isConfigured(): boolean {
    return true; // Always available as fallback
  }

  async send(payload: NotificationPayload): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `[${this.type.toUpperCase()}] Sending to ${payload.recipient}:`,
      payload.subject ? `Subject: ${payload.subject}` : '',
      `Message: ${payload.message}`
    );
  }
}
