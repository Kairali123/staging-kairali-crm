import { EmailProviderInterface, SendEmailOptions, SendEmailResult } from './EmailProviderInterface';
import * as nodemailer from 'nodemailer';

export class AmazonSESAdapter implements EmailProviderInterface {
  private transporter: nodemailer.Transporter | null = null;
  private accessKeyId: string = '';
  private secretAccessKey: string = '';
  private region: string = 'us-east-1';

  getProviderCode(): string {
    return 'ses';
  }

  initialize(config: Record<string, any>): void {
    if (!config.apiKey || !config.apiSecret) {
      throw new Error('AmazonSESAdapter requires apiKey (Access Key ID) and apiSecret (Secret Access Key)');
    }
    this.accessKeyId = config.apiKey;
    this.secretAccessKey = config.apiSecret;
    if (config.region) {
      this.region = config.region;
    }

    // Since we don't have AWS SDK installed by default in all Next.js environments natively,
    // we use Nodemailer's SMTP interface to SES as a reliable generic fallback.
    // In a full production env, we'd use @aws-sdk/client-ses.
    this.transporter = nodemailer.createTransport({
      host: `email-smtp.${this.region}.amazonaws.com`,
      port: 465,
      secure: true,
      auth: {
        user: this.accessKeyId,
        pass: this.secretAccessKey,
      }
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.transporter) {
      return { success: false, error: 'AmazonSESAdapter not initialized' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: options.fromName ? `"${options.fromName}" <${options.from}>` : options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        headers: {
          'X-Campaign-Id': options.campaignId || '',
          'X-Recipient-Id': options.recipientId || '',
        }
      });

      return {
        success: true,
        messageId: info.messageId ? info.messageId.replace(/[<>]/g, '') : undefined,
        originalResponse: info,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'SES SMTP error',
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      return await (this.transporter as any).verify();
    } catch {
      return false;
    }
  }
}
