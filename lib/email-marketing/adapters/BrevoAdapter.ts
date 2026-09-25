import { EmailProviderInterface, SendEmailOptions, SendEmailResult } from './EmailProviderInterface';

export class BrevoAdapter implements EmailProviderInterface {
  private apiKey: string = '';

  getProviderCode(): string {
    return 'brevo';
  }

  initialize(config: Record<string, any>): void {
    if (!config.apiKey) {
      throw new Error('BrevoAdapter requires an apiKey');
    }
    this.apiKey = config.apiKey;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const payload = {
        sender: {
          email: options.from,
          name: options.fromName || options.from,
        },
        to: [
          {
            email: options.to,
          },
        ],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
        replyTo: options.replyTo ? { email: options.replyTo } : undefined,
        headers: {
          'X-Mailin-custom': JSON.stringify({
            campaignId: options.campaignId,
            recipientId: options.recipientId,
          })
        }
      };

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Brevo API error: ${response.status}`,
          originalResponse: data,
        };
      }

      return {
        success: true,
        messageId: data.messageId,
        originalResponse: data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown network error',
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://api.brevo.com/v3/account', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
