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
      buttons, // Array of { text: string, url: string }
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
    let targetIds: (number | string)[] = [];
    if (target === 'channel') {
      const ch = (body.channel || '@fourandonemusic').trim();
      targetIds = [ch.startsWith('@') ? ch : `@${ch}`];
    } else if (target === 'single' && telegramId) {
      targetIds = [Number(telegramId)];
    } else if (target === 'selected' && Array.isArray(telegramIds)) {
      targetIds = telegramIds.map(Number).filter(Boolean);
    } else if (target === 'free') {
      const { data: users, error: uErr } = await db
        .from('telegram_users')
        .select('telegram_id, is_premium');
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
      targetIds = (users || []).filter(u => !u.is_premium).map(u => Number(u.telegram_id)).filter(Boolean);
    } else if (target === 'premium') {
      const { data: users, error: uErr } = await db
        .from('telegram_users')
        .select('telegram_id, is_premium');
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
      targetIds = (users || []).filter(u => !!u.is_premium).map(u => Number(u.telegram_id)).filter(Boolean);
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
      return NextResponse.json({ error: 'No recipients found for selected criteria' }, { status: 400 });
    }

    // Prepare reply_markup if buttons are provided
    let replyMarkup: Record<string, any> | undefined = undefined;
    if (Array.isArray(buttons) && buttons.length > 0) {
      const validButtons = buttons
        .filter(b => b && typeof b.text === 'string' && b.text.trim() && typeof b.url === 'string' && b.url.trim())
        .map(b => [{ text: b.text.trim(), url: b.url.trim() }]);
      if (validButtons.length > 0) {
        replyMarkup = { inline_keyboard: validButtons };
      }
    }

    // Map recipient profiles for personalized variables ({name}, {first_name}, {username})
    const userMap = new Map<number, { first_name?: string; last_name?: string; username?: string }>();
    const numericIds = targetIds.filter(id => typeof id === 'number') as number[];
    if (numericIds.length > 0) {
      const { data: profiles } = await db
        .from('telegram_users')
        .select('telegram_id, first_name, last_name, username')
        .in('telegram_id', numericIds);
      if (profiles) {
        for (const p of profiles) {
          userMap.set(Number(p.telegram_id), p);
        }
      }
    }

    // Send messages via Telegram Bot API with rate limiting
    let sentCount = 0;
    let failedCount = 0;
    const errors: { id: number | string; reason: string }[] = [];

    for (const chatId of targetIds) {
      try {
        // Personalize message text if variables are used
        let personalizedText = message;
        if (typeof chatId === 'number') {
          const profile = userMap.get(chatId);
          const firstName = profile?.first_name?.trim() || '';
          const lastName = profile?.last_name?.trim() || '';
          const fullName = [firstName, lastName].filter(Boolean).join(' ') || firstName || 'Dancer';
          const username = profile?.username ? `@${profile.username}` : fullName;

          personalizedText = personalizedText
            .replace(/\{name\}/gi, fullName)
            .replace(/\{first_name\}/gi, firstName || fullName)
            .replace(/\{username\}/gi, username);
        } else {
          // Channel target fallback
          personalizedText = personalizedText
            .replace(/\{name\}/gi, 'Dancer')
            .replace(/\{first_name\}/gi, 'Dancer')
            .replace(/\{username\}/gi, 'Dancer');
        }

        const payload: Record<string, any> = {
          chat_id: chatId,
          text: personalizedText,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        };
        if (replyMarkup) {
          payload.reply_markup = replyMarkup;
        }

        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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

      // Small delay between calls to respect Telegram rate limits
      if (targetIds.length > 1) {
        await new Promise(r => setTimeout(r, 40));
      }
    }

    return NextResponse.json({
      success: true,
      total: targetIds.length,
      sentCount,
      failedCount,
      errors: errors.slice(0, 20),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
