import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';
import { escapeHtml } from '@/utils/telegram-html';
import { sendNotificationEmail } from '@/utils/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    const { name, email, topic, message } = body;

    if (!email || !message) {
      return NextResponse.json(
        { error: 'Email and message are required.' },
        { status: 400 }
      );
    }

    const safeTopic = typeof topic === 'string' ? topic.trim().slice(0, 100) : 'Feedback';
    const safeName = name ? String(name).trim() : 'Anonymous';
    const safeEmail = String(email).trim();
    const safeMessage = String(message).trim();
    if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(safeEmail) || safeEmail.length > 254 || safeName.length > 200 || !safeMessage || safeMessage.length > 5000) {
      return NextResponse.json({ error: 'Enter a valid email and a message up to 5000 characters.' }, { status: 400 });
    }
    let emailSent = false;
    let messageSaved = false;

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
                    ${escapeHtml(safeTopic)}
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
                <td style="padding: 6px 0; color: #ffffff; font-weight: 700; font-size: 13.5px;">${escapeHtml(safeName)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: rgba(255,255,255,0.5); font-size: 12.5px;">Email:</td>
                <td style="padding: 6px 0;"><a href="mailto:${escapeHtml(safeEmail)}" style="color: #1db954; font-weight: 700; font-size: 13.5px; text-decoration: none;">${escapeHtml(safeEmail)}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: rgba(255,255,255,0.5); font-size: 12.5px;">Topic:</td>
                <td style="padding: 6px 0; color: #ffffff; font-size: 13px;">${escapeHtml(safeTopic)}</td>
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
            <div style="font-size: 14.5px; line-height: 1.6; color: #ffffff; white-space: pre-wrap;">${escapeHtml(safeMessage)}</div>
          </div>

          <!-- Quick Action -->
          <div style="text-align: center; margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.08);">
            <a href="mailto:${escapeHtml(safeEmail)}?subject=Re: [4and.one] ${escapeHtml(safeTopic)}" style="display: inline-block; background: #1db954; color: #000000; font-weight: 800; font-size: 13px; padding: 12px 28px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 18px rgba(29,185,84,0.3);">
              Reply Directly to ${escapeHtml(safeName)}
            </a>
          </div>

        </div>
      </div>
    `;

    try {
      const delivery = await sendNotificationEmail({
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
      emailSent = delivery.success;
    } catch (mailErr) {
      console.warn('[CONTACT_API] Email dispatch error:', mailErr);
    }

    // 2. Log message into Supabase (track_plays with event_type = 'contact_message')
    try {
      const db = getSupabaseAdmin();
      if (!db) throw new Error('Contact storage unavailable');
      const { error } = await db.from('track_plays').insert({
        track_id: 'contact_message',
        user_ref: safeName !== 'Anonymous' ? safeName : null,
        session_id: safeEmail,
        style: `${safeTopic}: ${safeMessage}`,
        bpm: safeEmail,
        duration_seconds: 0,
        event_type: 'contact_message',
      });
      if (error) throw error;
      messageSaved = true;
    } catch (dbErr) {
      console.warn('[CONTACT_API] Supabase logging error:', dbErr);
    }

    if (!emailSent && !messageSaved) return NextResponse.json({ error: 'Message could not be delivered. Please retry.' }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CONTACT_API] Error processing message:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send message.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Messages contain visitors' e-mails — admin only.
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();
  try {
    const [{ data: rawMessages, error: msgErr }, { data: delRows }] = await Promise.all([
      db
        .from('track_plays')
        .select('id, created_at, style, bpm, user_ref, session_id')
        .eq('event_type', 'contact_message')
        .order('created_at', { ascending: false }),
      db
        .from('folders')
        .select('color')
        .eq('name', '__deleted_msg__')
    ]);

    if (msgErr) throw msgErr;

    const deletedIds = new Set((delRows || []).map(r => r.color));
    const activeMessages = (rawMessages || []).filter(m => !deletedIds.has(m.id));

    return NextResponse.json({ success: true, count: activeMessages.length, messages: activeMessages });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // 1. Attempt direct delete on track_plays
    const { error } = await db
      .from('track_plays')
      .delete()
      .eq('id', id)
      .eq('event_type', 'contact_message');

    if (error) return NextResponse.json({ error: 'Message could not be deleted' }, { status: 502 });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('[CONTACT_API_DELETE] Error deleting message:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete message.' },
      { status: 500 }
    );
  }
}
