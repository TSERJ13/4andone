import { Resend } from 'resend';

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

  // 1. Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const res = await resend.emails.send({
        from: '4and.one <onboarding@resend.dev>',
        to: recipient,
        subject,
        html: html || text || '',
        text: text || '',
        replyTo: replyTo,
      });

      if (res.data?.id) {
        return { success: true, provider: 'resend', details: res.data };
      }
    } catch (resendErr) {
      console.warn('[MAILER] Resend dispatch failed, attempting FormSubmit:', resendErr);
    }
  }

  // 2. FormSubmit dispatch with browser-mimicking headers
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
