"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase";

export default function AnalyticsTracker() {
  const visitIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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
        const tg = (window as any).Telegram?.WebApp;
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
            duration_seconds: 0
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
    };
  }, []);

  return null; // Invisible component
}
