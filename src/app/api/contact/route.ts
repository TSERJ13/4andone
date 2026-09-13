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
      <div style="margin: 0; padding: 32px 16px; background-color: #070709; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 560px; margin: 0 auto; background: #111115; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
          
          <!-- Brand Header -->
          <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 18px; margin-bottom: 22px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <div style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                    <span style="color: #1db954;">4</span>and.one
                  </div>
                  <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px;">Direct Visitor Message</div>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <span style="background: rgba(29,185,84,0.15); border: 1px solid rgba(29,185,84,0.35); color: #1db954; font-size: 11.5px; font-weight: 800; padding: 5px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${safeTopic}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Sender Details Card -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: rgba(255,255,255,0.5); font-size: 12.5px; width: 80px;">From:</td>
                <td style="padding: 6px 0; color: #ffffff; font-weight: 700; font-size: 13.5px;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: rgba(255,255,255,0.5); font-size: 12.5px;">Email:</td>
                <td style="padding: 6px 0;"><a href="mailto:${safeEmail}" style="color: #1db954; font-weight: 700; font-size: 13.5px; text-decoration: none;">${safeEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: rgba(255,255,255,0.5); font-size: 12.5px;">Topic:</td>
                <td style="padding: 6px 0; color: #ffffff; font-size: 13px;">${safeTopic}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: rgba(255,255,255,0.5); font-size: 12.5px;">Date:</td>
                <td style="padding: 6px 0; color: rgba(255,255,255,0.65); font-size: 12.5px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <!-- Message Bubble -->
          <div style="background: rgba(255,255,255,0.04); border-left: 3px solid #1db954; border-radius: 0 12px 12px 0; padding: 18px 20px; margin-bottom: 24px;">
            <div style="font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Message Content</div>
            <div style="font-size: 14.5px; line-height: 1.6; color: #ffffff; white-space: pre-wrap;">${safeMessage}</div>
          </div>

          <!-- Quick Action -->
          <div style="text-align: center; margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.08);">
            <a href="mailto:${safeEmail}?subject=Re: [4and.one] ${safeTopic}" style="display: inline-block; background: #1db954; color: #000000; font-weight: 800; font-size: 13px; padding: 12px 28px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 18px rgba(29,185,84,0.3);">
              Reply Directly to ${safeName}
            </a>
          </div>

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
