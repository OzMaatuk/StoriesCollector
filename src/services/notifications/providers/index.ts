import { NotificationConfig, NotificationProvider } from './types';
import { ConsoleProvider } from './console.provider';
import { SmtpProvider } from './smtp.provider';
import { TextBeeProvider } from './textbee.provider';

export class NotificationService {
  private readonly providers: {
    email: NotificationProvider;
    sms: NotificationProvider;
  };

  constructor(config?: NotificationConfig) {
    const smtp = new SmtpProvider(config || {});
    const textbee = new TextBeeProvider(config || {});

    this.providers = {
      email: smtp.isConfigured() ? smtp : new ConsoleProvider('email'),
      sms: textbee.isConfigured() ? textbee : new ConsoleProvider('sms'),
    };
  }

  getProvider(type: 'email' | 'sms'): NotificationProvider {
    return this.providers[type];
  }
}
