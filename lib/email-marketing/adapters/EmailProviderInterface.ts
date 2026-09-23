export interface SendEmailOptions {
  to: string;
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  campaignId?: string;
  recipientId?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  originalResponse?: any;
}

export interface EmailProviderInterface {
  /**
   * Identifies the provider adapter (e.g., 'brevo', 'sendgrid')
   */
  getProviderCode(): string;

  /**
   * Initializes the provider adapter with credentials and configuration
   */
  initialize(config: Record<string, any>): void;

  /**
   * Sends a single email
   */
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
  
  /**
   * Verifies the provider credentials by making a test API call
   */
  verifyConnection(): Promise<boolean>;

  /**
   * Retrieves the latest quotas/limits from the provider (if supported)
   */
  getQuotas?(): Promise<{ limit: number; remaining: number } | null>;
}
