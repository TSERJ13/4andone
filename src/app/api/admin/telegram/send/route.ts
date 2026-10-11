import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdmin, serviceRoleMissing } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const db = getSupabaseAdmin();
  if (!db) return serviceRoleMissing();

  try {
    const body = await req.json();
    const { 
      message, 
      target = 'single', 
      telegramId, 
      telegramIds, 
      botToken: customToken 
    } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    // Determine bot token: env var or custom token supplied by admin
    const token = (
      process.env.TELEGRAM_BOT_TOKEN ||
      process.env.TELEGRAM_LOGIN_BOT_TOKEN ||
      process.env.TELEGRAM_WEBAPP_BOT_TOKEN ||
      customToken
    )?.trim();

    if (!token) {
      return NextResponse.json({ 
        error: 'BOT_TOKEN_MISSING',
        message: 'Telegram Bot Token is not configured. Please supply your bot token from @BotFather.' 
      }, { status: 400 });
    }

    // Determine recipient IDs
    let targetIds: number[] = [];
    if (target === 'single' && telegramId) {
      targetIds = [Number(telegramId)];
    } else if (target === 'selected' && Array.isArray(telegramIds)) {
      targetIds = telegramIds.map(Number).filter(Boolean);
    } else if (target === 'broadcast') {
      const { data: users, error: uErr } = await db
        .from('telegram_users')
        .select('telegram_id');
      if (uErr) {
        return NextResponse.json({ error: uErr.message }, { status: 500 });
      }
      targetIds = (users || []).map(u => Number(u.telegram_id)).filter(Boolean);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
    }

    // Send messages via Telegram Bot API with rate limiting
    let sentCount = 0;
    let failedCount = 0;
    const errors: { id: number; reason: string }[] = [];

    for (const chatId of targetIds) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: false,
          }),
        });

        const data = await res.json();
        if (data.ok) {
          sentCount++;
        } else {
          failedCount++;
          errors.push({ id: chatId, reason: data.description || 'Unknown error' });
        }
      } catch (err: any) {
        failedCount++;
        errors.push({ id: chatId, reason: err.message || 'Network error' });
      }

      // Small delay between calls to respect Telegram 30 msgs/sec rate limits
      if (targetIds.length > 1) {
        await new Promise(r => setTimeout(r, 40));
      }
    }

    return NextResponse.json({
      success: true,
      total: targetIds.length,
      sentCount,
      failedCount,
      errors: errors.slice(0, 20), // return top 20 error reasons
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
