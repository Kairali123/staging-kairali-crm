import { EmailProviderInterface } from './EmailProviderInterface';
import { BrevoAdapter } from './BrevoAdapter';
import { SendGridAdapter } from './SendGridAdapter';
import { MailgunAdapter } from './MailgunAdapter';
import { AmazonSESAdapter } from './AmazonSESAdapter';

export class ProviderFactory {
  static createAdapter(providerType: string, config: Record<string, any>): EmailProviderInterface {
    let adapter: EmailProviderInterface;

    switch (providerType.toLowerCase()) {
      case 'brevo':
        adapter = new BrevoAdapter();
        break;
      case 'sendgrid':
        adapter = new SendGridAdapter();
        break;
      case 'mailgun':
        adapter = new MailgunAdapter();
        break;
      case 'ses':
      case 'amazon_ses':
        adapter = new AmazonSESAdapter();
        break;
      default:
        throw new Error(`Unsupported email provider type: ${providerType}`);
    }

    adapter.initialize(config);
    return adapter;
  }
}
