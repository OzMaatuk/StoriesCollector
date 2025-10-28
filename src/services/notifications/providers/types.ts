export interface NotificationPayload {
  recipient: string;
  subject?: string;
  message: string;
}

export interface NotificationProvider {
  type: 'email' | 'sms';
  isConfigured(): boolean;
  send(payload: NotificationPayload): Promise<void>;
}

export interface NotificationConfig {
  // Email (SMTP) configuration
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  emailFrom?: string;

  // SMS (TextBee) configuration
  textbeeBaseUrl?: string;
  textbeeDeviceId?: string;
  textbeeApiKey?: string;
}

export class NotificationError extends Error {
  constructor(message: string, public readonly provider: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'NotificationError';
  }
}
