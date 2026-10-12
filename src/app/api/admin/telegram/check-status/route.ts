import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { botToken: customToken, telegramIds } = body;

    const token = (
      process.env.TELEGRAM_BOT_TOKEN ||
      process.env.TELEGRAM_LOGIN_BOT_TOKEN ||
      process.env.TELEGRAM_WEBAPP_BOT_TOKEN ||
      customToken
    )?.trim();

    if (!token) {
      return NextResponse.json({ 
        error: 'BOT_TOKEN_MISSING',
        message: 'Telegram Bot Token is not configured.' 
      }, { status: 400 });
    }

    if (!Array.isArray(telegramIds) || telegramIds.length === 0) {
      return NextResponse.json({ activeIds: [], inactiveIds: [] });
    }

    // Limit check to at most 100 users per batch to avoid excessive latency
    const idsToCheck = telegramIds.slice(0, 100);

    const activeIds: number[] = [];
    const inactiveIds: number[] = [];

    // Check with sendChatAction (typing) in chunks of 5
    const CHUNK_SIZE = 5;
    for (let i = 0; i < idsToCheck.length; i += CHUNK_SIZE) {
      const chunk = idsToCheck.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (chatId) => {
          try {
            const res = await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                action: 'typing'
              }),
            });
            const data = await res.json();
            if (data.ok) {
              activeIds.push(Number(chatId));
            } else {
              inactiveIds.push(Number(chatId));
            }
          } catch {
            // Network or other error - treat as unknown / inactive
            inactiveIds.push(Number(chatId));
          }
        })
      );
      if (i + CHUNK_SIZE < idsToCheck.length) {
        await new Promise(r => setTimeout(r, 60));
      }
    }

    return NextResponse.json({
      success: true,
      activeIds,
      inactiveIds,
      totalChecked: idsToCheck.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
