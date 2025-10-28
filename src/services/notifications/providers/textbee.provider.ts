import {
  NotificationConfig,
  NotificationPayload,
  NotificationProvider,
  NotificationError,
} from './types';

import type { AxiosInstance } from 'axios';

export class TextBeeProvider implements NotificationProvider {
  readonly type = 'sms' as const;
  private axiosInstance?: AxiosInstance;

  constructor(private config: NotificationConfig) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.textbeeBaseUrl && this.config.textbeeDeviceId && this.config.textbeeApiKey
    );
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.isConfigured()) {
      throw new NotificationError('TextBee not configured', 'sms');
    }

    try {
      // Dynamic import axios when needed
      if (!this.axiosInstance) {
        const { default: axios } = await import('axios');
        this.axiosInstance = axios;
      }

      const url = `${this.config.textbeeBaseUrl!.replace(/\/+$/u, '')}/gateway/devices/${
        this.config.textbeeDeviceId
      }/send-sms`;

      await this.axiosInstance.post(
        url,
        {
          recipients: [payload.recipient],
          message: payload.message,
        },
        {
          headers: {
            'x-api-key': this.config.textbeeApiKey,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );
    } catch (err) {
      throw new NotificationError('Failed to send SMS notification', 'sms', err);
    }
  }
}
