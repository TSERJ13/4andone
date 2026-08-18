"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";
import { usePathname } from "next/navigation";

// Shape of the Telegram Mini App user object we read from window.Telegram.
interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const visitIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prevent logging or presence sync for admin pages
    if (pathname?.startsWith("/admin") || pathname === "/sa-login") {
      return;
    }

    // 1. Initialize Session
    let sessionId = sessionStorage.getItem("4andone_session_id");
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("4andone_session_id", sessionId);
    }
    sessionIdRef.current = sessionId;

    const logVisit = async () => {
      try {
        // 2. Fetch Geo-IP (Country)
        let countryCode = "Unknown";
        let countryName = "Unknown";
        
        try {
          const res = await fetch("https://ipapi.co/json/");
          if (res.ok) {
            const data = await res.json();
            countryCode = data.country_code || "Unknown";
            countryName = data.country_name || "Unknown";
          }
        } catch (e) {
          console.warn("[ANALYTICS] Geo-IP failed:", e);
        }

        // 3. Telegram WebApp Integration
        let userRef = null;
        const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: TelegramWebAppUser } } } }).Telegram?.WebApp;
        if (tg?.initDataUnsafe?.user) {
          const user = tg.initDataUnsafe.user;
          userRef = user.id.toString();

          // Sync Telegram User
          await supabase.from("telegram_users").upsert({
            telegram_id: user.id,
            first_name: user.first_name,
            last_name: user.last_name || null,
            username: user.username || null,
            photo_url: user.photo_url || null,
            country_code: countryCode,
            country_name: countryName,
            last_seen: new Date().toISOString(),
          }, { onConflict: "telegram_id" });

          // Increment visit count via helper function
          await supabase.rpc("increment_user_visit", { uid: user.id });
        }

        // 4. Initial Page Visit Entry
        const { data, error } = await supabase
          .from("page_visits")
          .insert({
            session_id: sessionId,
            user_ref: userRef,
            country_code: countryCode,
            country_name: countryName,
            duration_seconds: 0,
            referrer: document.referrer || null,
          })
          .select("id")
          .single();

        if (error) throw error;
        if (data) visitIdRef.current = data.id;

        // 5. Periodic Duration Update (every 20 seconds)
        let elapsed = 0;
        updateIntervalRef.current = setInterval(async () => {
          if (!visitIdRef.current) return;
          elapsed += 20;
          await supabase
            .from("page_visits")
            .update({ duration_seconds: elapsed })
            .eq("id", visitIdRef.current);
        }, 20000);

      } catch (err) {
        console.error("[ANALYTICS] Visit logging error:", err);
      }
    };

    logVisit();

    // LIVE PRESENCE: join a realtime presence channel so the admin dashboard can
    // count who is currently online. Presence auto-clears when the tab closes —
    // no database table or cron cleanup needed.
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: TelegramWebAppUser } } } }).Telegram?.WebApp?.initDataUnsafe?.user;
      const displayName = tg
        ? [tg.first_name, tg.last_name].filter(Boolean).join(' ') || (tg.username ? '@' + tg.username : 'Telegram user')
        : null;

      presenceChannel = supabase.channel('4andone-live', {
        config: { presence: { key: sessionId } },
      });

      presenceChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          presenceChannel?.track({
            session_id: sessionId,
            name: displayName,            // null = anonymous web visitor
            is_telegram: !!tg,
            online_at: new Date().toISOString(),
          });
        }
      });
    } catch (e) {
      console.warn('[ANALYTICS] presence init failed:', e);
    }

    return () => {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
      if (presenceChannel) {
        presenceChannel.untrack();
        supabase.removeChannel(presenceChannel);
      }
    };
  }, []);

  return null; // Invisible component
}
