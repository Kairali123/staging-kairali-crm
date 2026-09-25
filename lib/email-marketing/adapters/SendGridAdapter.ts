import { EmailProviderInterface, SendEmailOptions, SendEmailResult } from './EmailProviderInterface';

export class SendGridAdapter implements EmailProviderInterface {
  private apiKey: string = '';

  getProviderCode(): string {
    return 'sendgrid';
  }

  initialize(config: Record<string, any>): void {
    if (!config.apiKey) {
      throw new Error('SendGridAdapter requires an apiKey');
    }
    this.apiKey = config.apiKey;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const payload = {
        personalizations: [
          {
            to: [{ email: options.to }],
            custom_args: {
              campaign_id: options.campaignId || '',
              recipient_id: options.recipientId || '',
            }
          }
        ],
        from: {
          email: options.from,
          name: options.fromName,
        },
        reply_to: options.replyTo ? { email: options.replyTo } : undefined,
        subject: options.subject,
        content: [
          { type: 'text/plain', value: options.text || 'Please view this email in an HTML compatible client.' },
          { type: 'text/html', value: options.html }
        ]
      };

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `SendGrid API error: ${response.status}`,
          originalResponse: errorData,
        };
      }

      // SendGrid returns 202 Accepted without a body, and message ID is in headers
      const messageId = response.headers.get('x-message-id') || undefined;

      return {
        success: true,
        messageId,
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
      const response = await fetch('https://api.sendgrid.com/v3/scopes', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
