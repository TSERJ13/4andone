import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { sendNotificationEmail } from '@/utils/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, topic, message } = body;

    if (!email || !message) {
      return NextResponse.json(
        { error: 'Email and message are required.' },
        { status: 400 }
      );
    }

    const safeTopic = topic || 'Feedback';
    const safeName = name ? String(name).trim() : 'Anonymous';
    const safeEmail = String(email).trim();
    const safeMessage = String(message).trim();

    // 1. Send email notification to 4andonestudio@gmail.com
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0d0d; color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #1db954;">New Message 4and.one</h2>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 13px; width: 100px;">Topic:</td>
            <td style="padding: 8px 0; font-weight: 700; font-size: 14px; color: #ffffff;"><span style="background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 4px 10px; border-radius: 9999px;">${safeTopic}</span></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 13px;">Sender:</td>
            <td style="padding: 8px 0; font-weight: 600; font-size: 14px; color: #ffffff;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 13px;">Email:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #1db954;"><a href="mailto:${safeEmail}" style="color: #1db954; text-decoration: none;">${safeEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: rgba(255,255,255,0.6); font-size: 13px;">Date:</td>
            <td style="padding: 8px 0; font-size: 13px; color: rgba(255,255,255,0.7);">${new Date().toLocaleString()}</td>
          </tr>
        </table>

        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin-top: 10px;">
          <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255,255,255,0.5);">Message Content:</p>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #ffffff; white-space: pre-wrap;">${safeMessage}</p>
        </div>
      </div>
    `;

    try {
      await sendNotificationEmail({
        subject: 'New Message 4and.one',
        html: emailHtml,
        text: `New Message 4and.one\n\nTopic: ${safeTopic}\nFrom: ${safeName} (${safeEmail})\n\nMessage:\n${safeMessage}`,
        replyTo: safeEmail,
        fields: {
          Sender_Name: safeName,
          Sender_Email: safeEmail,
          Topic: safeTopic,
          Message: safeMessage,
        },
      });
    } catch (mailErr) {
      console.warn('[CONTACT_API] Email dispatch error:', mailErr);
    }

    // 2. Log message into Supabase (track_plays with event_type = 'contact_message')
    try {
      await supabase.from('track_plays').insert({
        track_id: 'contact_message',
        user_ref: safeName !== 'Anonymous' ? safeName : null,
        session_id: safeEmail,
        style: `${safeTopic}: ${safeMessage.slice(0, 100)}`,
        bpm: safeEmail,
        duration_seconds: 0,
        event_type: 'contact_message',
      });
    } catch (dbErr) {
      console.warn('[CONTACT_API] Supabase logging error:', dbErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CONTACT_API] Error processing message:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send message.' },
      { status: 500 }
    );
  }
}
