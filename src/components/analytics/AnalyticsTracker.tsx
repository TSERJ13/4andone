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

    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
    let displayName: string | null = null;
    let isTg = false;

    const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: TelegramWebAppUser } } } }).Telegram?.WebApp?.initDataUnsafe?.user;
    if (tg) {
      isTg = true;
      displayName = [tg.first_name, tg.last_name].filter(Boolean).join(' ') || (tg.username ? '@' + tg.username : 'Telegram user');
    }

    let countryCode = "Unknown";
    let countryName = "Unknown";
    if (typeof window !== "undefined") {
      countryCode = sessionStorage.getItem("4andone_country_code") || "Unknown";
      countryName = sessionStorage.getItem("4andone_country_name") || "Unknown";
    }

    const sendPresence = (code: string, name: string) => {
      if (!presenceChannel) return;
      try {
        presenceChannel.track({
          session_id: sessionId,
          name: displayName,
          is_telegram: isTg,
          country_code: code,
          country_name: name,
          online_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("[ANALYTICS] presence track error:", e);
      }
    };

    // Initialize Presence
    try {
      presenceChannel = supabase.channel('4andone-live', {
        config: { presence: { key: sessionId } },
      });

      presenceChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          sendPresence(countryCode, countryName);
        }
      });
    } catch (e) {
      console.warn('[ANALYTICS] presence init failed:', e);
    }

    const logVisit = async () => {
      try {
        // 2. Fetch Geo-IP (Country) if not already known
        if (countryCode === "Unknown") {
          try {
            const geoRes = await fetch("/api/geo");
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.country_code && geoData.country_code !== "Unknown") {
                countryCode = geoData.country_code;
                countryName = geoData.country_name || geoData.country_code;
              }
            }
          } catch (e) {
            // Internal geo failed, proceed to external fallback
          }

          if (countryCode === "Unknown") {
            try {
              const res = await fetch("https://ipapi.co/json/");
              if (res.ok) {
                const data = await res.json();
                countryCode = data.country_code || "Unknown";
                countryName = data.country_name || "Unknown";
              }
            } catch (e) {
              console.warn("[ANALYTICS] Geo-IP external fallback failed:", e);
            }
          }

          if (typeof window !== "undefined") {
            sessionStorage.setItem("4andone_country_code", countryCode);
            sessionStorage.setItem("4andone_country_name", countryName);
          }

          // Re-send presence with now-resolved country
          sendPresence(countryCode, countryName);
        }

        // 3. Telegram WebApp Integration
        let userRef = null;
        if (tg) {
          userRef = tg.id.toString();

          // Sync Telegram User
          await supabase.from("telegram_users").upsert({
            telegram_id: tg.id,
            first_name: tg.first_name,
            last_name: tg.last_name || null,
            username: tg.username || null,
            photo_url: tg.photo_url || null,
            country_code: countryCode,
            country_name: countryName,
            last_seen: new Date().toISOString(),
          }, { onConflict: "telegram_id" });

          // Increment visit count via helper function
          await supabase.rpc("increment_user_visit", { uid: tg.id });
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
