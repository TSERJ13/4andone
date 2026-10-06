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

    // 1. Initialize Persistent Visitor & Session
    let visitorId = typeof window !== 'undefined' ? localStorage.getItem("4andone_visitor_id") : null;
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      if (typeof window !== 'undefined') localStorage.setItem("4andone_visitor_id", visitorId);
    }

    let sessionId = sessionStorage.getItem("4andone_session_id");
    let isNewSession = false;
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("4andone_session_id", sessionId);
      isNewSession = true;
    }
    sessionIdRef.current = sessionId;

    let visitCount = 1;
    if (typeof window !== 'undefined') {
      const savedCount = parseInt(localStorage.getItem("4andone_visit_count") || '0', 10);
      if (isNewSession) {
        visitCount = savedCount + 1;
        localStorage.setItem("4andone_visit_count", visitCount.toString());
      } else {
        visitCount = Math.max(1, savedCount);
      }
    }

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
    let clientIp = "";
    let clientCity = "";
    if (typeof window !== "undefined") {
      countryCode = sessionStorage.getItem("4andone_country_code") || "Unknown";
      countryName = sessionStorage.getItem("4andone_country_name") || "Unknown";
      clientIp = sessionStorage.getItem("4andone_client_ip") || "";
      clientCity = sessionStorage.getItem("4andone_client_city") || "";
    }

    const sendPresence = (code: string, name: string, ipAddr: string, cityStr: string) => {
      if (!presenceChannel) return;
      try {
        presenceChannel.track({
          session_id: sessionId,
          visitor_id: visitorId,
          ip: ipAddr || null,
          city: cityStr || null,
          visit_count: visitCount,
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
          sendPresence(countryCode, countryName, clientIp, clientCity);
        }
      });
    } catch (e) {
      console.warn('[ANALYTICS] presence init failed:', e);
    }

    const logVisit = async () => {
      try {
        // 2. Fetch Geo-IP (Country & IP)
        if (countryCode === "Unknown" || !clientIp) {
          try {
            const geoRes = await fetch("/api/geo");
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.country_code && geoData.country_code !== "Unknown") {
                countryCode = geoData.country_code;
                countryName = geoData.country_name || geoData.country_code;
              }
              if (geoData.ip) clientIp = geoData.ip;
              if (geoData.city) clientCity = geoData.city;
            }
          } catch (e) {
            // Internal geo failed
          }

          if (!clientIp) {
            try {
              const ipRes = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
              if (ipRes.ok) {
                const ipData = await ipRes.json();
                if (ipData.ip) clientIp = ipData.ip;
              }
            } catch (e) {}
          }

          if (countryCode === "Unknown") {
            try {
              const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
              if (res.ok) {
                const data = await res.json();
                countryCode = data.country_code || "Unknown";
                countryName = data.country_name || "Unknown";
                if (!clientIp && data.ip) clientIp = data.ip;
                if (!clientCity && data.city) clientCity = data.city;
              }
            } catch (e) {
              console.warn("[ANALYTICS] Geo-IP external fallback failed:", e);
            }
          }

          if (typeof window !== "undefined") {
            sessionStorage.setItem("4andone_country_code", countryCode);
            sessionStorage.setItem("4andone_country_name", countryName);
            if (clientIp) sessionStorage.setItem("4andone_client_ip", clientIp);
            if (clientCity) sessionStorage.setItem("4andone_client_city", clientCity);
          }

          // Re-send presence with resolved IP, city, country
          sendPresence(countryCode, countryName, clientIp, clientCity);
        }

        // 3. Telegram WebApp Integration
        let userRef: string | null = null;
        if (tg) {
          userRef = tg.id.toString();

          // Sync Telegram User (server-side: telegram_users is not writable
          // with the public key)
          await fetch("/api/user/sync", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              telegram_id: tg.id,
              first_name: tg.first_name,
              last_name: tg.last_name || null,
              username: tg.username || null,
              photo_url: tg.photo_url || null,
              country_code: countryCode,
              country_name: countryName,
            }),
          }).catch(() => {});
        } else if (clientIp) {
          // Record IP for web visitor
          userRef = `ip:${clientIp}`;
        } else if (visitorId) {
          userRef = `v:${visitorId.slice(0, 10)}`;
        }

        // 4. Initial Page Visit Entry
        const visitPayload: Record<string, any> = {
          session_id: sessionId,
          user_ref: userRef,
          country_code: countryCode,
          country_name: countryName,
          duration_seconds: 0,
          referrer: document.referrer || null,
        };

        const { data, error } = await supabase
          .from("page_visits")
          .insert(visitPayload)
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
