"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, ArrowDownToLine } from "lucide-react";
import Link from "next/link";

/**
 * OfflineBanner — shown when the device has no internet connection.
 * It fades in/out automatically as connectivity changes.
 * No risk to online functionality: the component only renders when offline.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read initial state
    setIsOffline(!navigator.onLine);

    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  // Don't render anything until client-side (avoids SSR mismatch)
  if (!mounted || !isOffline) return null;

  return (
    <>
      <div className="offline-banner" role="status" aria-live="polite">
        <div className="offline-inner">
          <WifiOff size={16} className="offline-icon" />
          <span className="offline-text">
            You&apos;re offline &mdash; only downloaded tracks are available.
          </span>
          <Link href="/library/downloaded" className="offline-link">
            <ArrowDownToLine size={14} />
            Downloads
          </Link>
        </div>
      </div>

      <style jsx>{`
        .offline-banner {
          position: fixed;
          top: env(safe-area-inset-top, 0px);
          left: 0;
          right: 0;
          z-index: 9999;
          background: linear-gradient(90deg, #1a1a1a 0%, #111 100%);
          border-bottom: 1px solid rgba(239, 68, 68, 0.35);
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }

        .offline-inner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 16px;
          max-width: 900px;
          margin: 0 auto;
        }

        .offline-icon {
          color: #ef4444;
          flex-shrink: 0;
        }

        .offline-text {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #d4d4d8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .offline-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
          color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
          border-radius: 20px;
          padding: 4px 10px;
          white-space: nowrap;
          transition: background 0.2s;
          text-decoration: none;
        }

        .offline-link:hover {
          background: rgba(34, 197, 94, 0.2);
        }

        @media (max-width: 500px) {
          .offline-text {
            font-size: 11px;
          }
        }
      `}</style>
    </>
  );
}
