import { EmailProviderInterface, SendEmailOptions, SendEmailResult } from './EmailProviderInterface';

export class MailgunAdapter implements EmailProviderInterface {
  private apiKey: string = '';
  private domain: string = '';
  private region: string = 'us'; // 'us' or 'eu'

  getProviderCode(): string {
    return 'mailgun';
  }

  initialize(config: Record<string, any>): void {
    if (!config.apiKey || !config.domain) {
      throw new Error('MailgunAdapter requires an apiKey and a domain');
    }
    this.apiKey = config.apiKey;
    this.domain = config.domain;
    if (config.region) {
      this.region = config.region;
    }
  }

  private getBaseUrl(): string {
    return this.region === 'eu' 
      ? `https://api.eu.mailgun.net/v3/${this.domain}`
      : `https://api.mailgun.net/v3/${this.domain}`;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const auth = Buffer.from(`api:${this.apiKey}`).toString('base64');
      
      const formData = new URLSearchParams();
      formData.append('from', options.fromName ? `${options.fromName} <${options.from}>` : options.from);
      formData.append('to', options.to);
      formData.append('subject', options.subject);
      formData.append('html', options.html);
      if (options.text) {
        formData.append('text', options.text);
      }
      if (options.replyTo) {
        formData.append('h:Reply-To', options.replyTo);
      }
      
      // Custom variables for webhook tracking
      if (options.campaignId) {
        formData.append('v:campaignId', options.campaignId);
      }
      if (options.recipientId) {
        formData.append('v:recipientId', options.recipientId);
      }

      const response = await fetch(`${this.getBaseUrl()}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Mailgun API error: ${response.status}`,
          originalResponse: data,
        };
      }

      return {
        success: true,
        // Mailgun returns id enclosed in < >
        messageId: data.id ? data.id.replace(/[<>]/g, '') : undefined,
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
      const auth = Buffer.from(`api:${this.apiKey}`).toString('base64');
      // Using the domains endpoint to verify credentials
      const response = await fetch(`${this.getBaseUrl()}/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
