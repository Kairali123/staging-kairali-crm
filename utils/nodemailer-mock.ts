class DummyTransporter {
  config: any;
  constructor(config: any) {
    this.config = config;
  }

  async sendMail(options: any): Promise<any> {
    console.log('[Mock Nodemailer] Sending email:');
    console.log(`From: ${options.from}`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    return {
      messageId: 'mock-msg-' + Date.now(),
      response: '250 OK'
    };
  }
}

export function createTransport(config: any) {
  return new DummyTransporter(config);
}

const nodemailer = {
  createTransport
};

export default nodemailer;
