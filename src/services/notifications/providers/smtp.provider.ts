import {
  NotificationConfig,
  NotificationPayload,
  NotificationProvider,
  NotificationError,
} from './types';
import type { Transporter } from 'nodemailer';

export class SmtpProvider implements NotificationProvider {
  readonly type = 'email' as const;
  private transporter?: Transporter;

  constructor(private config: NotificationConfig) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.smtpHost && this.config.smtpPort && this.config.smtpUser && this.config.smtpPass
    );
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.isConfigured()) {
      throw new NotificationError('SMTP not configured', 'email');
    }

    try {
      // Dynamic import for nodemailer to keep it optional at runtime
      const { createTransport } = await import('nodemailer');

      // Create transporter if not exists
      if (!this.transporter) {
        this.transporter = createTransport({
          host: this.config.smtpHost,
          port: this.config.smtpPort,
          secure: this.config.smtpSecure ?? false,
          auth: {
            user: this.config.smtpUser,
            pass: this.config.smtpPass,
          },
        });
      }

      await this.transporter.sendMail({
        from: this.config.emailFrom || this.config.smtpUser,
        to: payload.recipient,
        subject: payload.subject,
        text: payload.message,
      });
    } catch (err) {
      throw new NotificationError('Failed to send email notification', 'email', err);
    }
  }
}
