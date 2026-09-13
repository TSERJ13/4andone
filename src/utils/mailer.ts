export interface SendEmailOptions {
  subject: string;
  html?: string;
  text?: string;
  fields?: Record<string, any>;
  replyTo?: string;
}

export async function sendNotificationEmail({
  subject,
  html,
  text,
  fields,
  replyTo,
}: SendEmailOptions): Promise<{ success: boolean; provider: string; details?: any }> {
  const recipient = '4andonestudio@gmail.com';

  // 1. Try Direct Gmail SMTP if GMAIL_APP_PASSWORD is configured
  if (process.env.GMAIL_APP_PASSWORD) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: '4andonestudio@gmail.com',
          pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
        },
      });

      // Uses exact requested sender title: "New Message 4and.one" or "Daily Statistic 4and.one"
      const senderTitle = subject;
      const info = await transporter.sendMail({
        from: `"${senderTitle}" <4andonestudio@gmail.com>`,
        to: recipient,
        subject: subject,
        html: html || text || '',
        text: text || '',
        replyTo: replyTo,
      });

      if (info.messageId) {
        return { success: true, provider: 'gmail_smtp', details: info };
      }
    } catch (smtpErr) {
      console.warn('[MAILER] Gmail SMTP dispatch error, attempting fallback:', smtpErr);
    }
  }

  // 2. FormSubmit fallback with browser-mimicking headers
  try {
    const payload: Record<string, any> = {
      _subject: subject,
      _template: 'table',
      ...(fields || {}),
    };

    if (text && !fields?.message) {
      payload.message = text;
    }
    if (replyTo) {
      payload._replyto = replyTo;
    }

    const response = await fetch(`https://formsubmit.co/ajax/${recipient}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://4and.one',
        'Referer': 'https://4and.one/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    return {
      success: response.ok,
      provider: 'formsubmit',
      details: data,
    };
  } catch (fsErr) {
    console.error('[MAILER] FormSubmit dispatch error:', fsErr);
    return { success: false, provider: 'none', details: fsErr };
  }
}
