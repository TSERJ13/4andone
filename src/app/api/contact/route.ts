import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

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

    // 1. Send email notification to 4andonestudio@gmail.com via FormSubmit
    try {
      const emailPayload = {
        _subject: `[4and.one ${safeTopic}] New message from ${safeName}`,
        name: safeName,
        email: safeEmail,
        topic: safeTopic,
        message: safeMessage,
        _template: 'table',
      };

      await fetch('https://formsubmit.co/ajax/4andonestudio@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://4and.one',
          'Referer': 'https://4and.one',
        },
        body: JSON.stringify(emailPayload),
      });
    } catch (mailErr) {
      console.warn('[CONTACT_API] Email forwarding error:', mailErr);
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
