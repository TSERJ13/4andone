"use client";

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdBanner } from '@/components/ads/AdBanner';

interface TrackLimitAdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Responsive display unit for the ad break ("მთავარი რეკლამა", Responsive).
// Can be overridden with NEXT_PUBLIC_ADSENSE_BREAK_SLOT.
const BREAK_AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_BREAK_SLOT || '7693569362';
const SKIP_AFTER_SECONDS = 5;   // "Skip" appears after 5s
const AD_SECONDS = 15;          // the ad closes by itself after 15s

type Step = 'ad' | 'promo';

/**
 * Ad break shown to free users every 8 tracks (music is paused by AudioProvider).
 * Step 1: the advertisement on its own full screen (no popup around it). It
 *         closes by itself after 15s; "Skip" is available after 5s.
 * Step 2: the separate popup — "that was a sponsored ad; go Ad-Free Premium".
 * If AdSense has no ad to show, step 1 is skipped automatically.
 */
export const TrackLimitAdModal: React.FC<TrackLimitAdModalProps> = ({ isOpen, onClose }) => {
  // Mounted fresh on every open, so each break starts at the ad step.
  if (!isOpen) return null;
  return <AdBreak onClose={onClose} />;
};

const AdBreak: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { setIsSubscriptionModalOpen } = useAuth();
  const [step, setStep] = useState<Step>('ad');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (step !== 'ad') return;
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= AD_SECONDS) {
          clearInterval(timer);
          setStep('promo'); // ad finished → it closes, the popup follows
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const skipIn = Math.max(0, SKIP_AFTER_SECONDS - elapsed);
  const adLeft = Math.max(0, AD_SECONDS - elapsed);

  const handleOpenSubscription = () => {
    onClose();
    setIsSubscriptionModalOpen(true);
  };

  return (
    <>
      {step === 'ad' ? (
        // STEP 1 — THE AD ITSELF: its own full screen, no popup around it.
        <div className="track-ad-fullscreen" role="dialog" aria-modal="true" aria-label="Advertisement">
          <div className="track-ad-top track-ad-top--bar">
            <span className="track-ad-badge">Ad · {adLeft}s</span>
            {skipIn > 0 ? (
              <span className="track-ad-timer">Skip in {skipIn}s</span>
            ) : (
              <button className="track-ad-skip-btn" onClick={() => setStep('promo')}>
                <span>Skip</span>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="track-ad-fullscreen-slot">
            <AdBanner
              slot={BREAK_AD_SLOT}
              responsive
              fillHeight="calc(100dvh - 88px)"
              height={250}
              onStatusChange={(status) => {
                if (status === 'unfilled') setStep('promo');
              }}
            />
          </div>
        </div>
      ) : (
        // STEP 2 — YOUR POPUP, shown after the ad has closed.
        <div className="track-ad-modal-overlay" role="dialog" aria-modal="true">
          <div className="track-ad-card animate-in-popup">
            <div className="track-ad-top">
              <span className="track-ad-badge">Sponsored intermission</span>
              <button className="track-ad-skip-btn" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="track-ad-heading">
              <h3>That was a sponsored ad</h3>
              <p>
                Want to listen without ads? Get the Ad-Free Premium subscription.
              </p>
            </div>

            <div className="track-ad-premium-cta" onClick={handleOpenSubscription}>
              <div className="cta-left">
                <div className="cta-icon">
                  <Sparkles size={18} className="text-emerald" />
                </div>
                <div className="cta-text">
                  <strong>Ad-Free Premium</strong>
                  <span>Only $1.99/mo • Instant activation</span>
                </div>
              </div>
              <button className="cta-btn" type="button">Upgrade</button>
            </div>

            <button className="track-ad-continue-btn" type="button" onClick={onClose}>
              <Play size={16} />
              <span>Continue listening</span>
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .track-ad-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
        }

        .track-ad-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          background: #000;
          padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
          gap: 12px;
        }
        .track-ad-top--bar {
          flex-shrink: 0;
          min-height: 40px;
        }
        .track-ad-fullscreen-slot {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 12px;
          background: #0b0b0c;
        }

        .track-ad-card {
          background: #121214;
          border: 1px solid rgba(255, 255, 255, 0.12);
          width: 100%;
          max-width: 420px;
          border-radius: 24px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          color: white;
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.95);
        }
        .track-ad-card--ad {
          max-width: 520px;
          padding: 16px;
        }

        .track-ad-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 8px;
        }

        .track-ad-badge {
          display: inline-block;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #a1a1aa;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 10px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .track-ad-timer {
          font-size: 0.8rem;
          color: #a1a1aa;
          font-weight: 600;
          white-space: nowrap;
        }

        .track-ad-skip-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #10b981;
          color: black;
          border: none;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 6px 14px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .track-ad-skip-btn:hover {
          background: #34d399;
          transform: scale(1.02);
        }

        .track-ad-heading {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .track-ad-heading h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
        }
        .track-ad-heading p {
          margin: 0;
          font-size: 0.88rem;
          line-height: 1.45;
          color: #a1a1aa;
        }

        .track-ad-banner-box {
          width: 100%;
          min-height: 250px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .track-ad-premium-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .track-ad-premium-cta:hover {
          border-color: rgba(16, 185, 129, 0.6);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(16, 185, 129, 0.08));
        }

        .cta-left {
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
        }
        .cta-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cta-text {
          display: flex;
          flex-direction: column;
        }
        .cta-text strong {
          font-size: 0.88rem;
          color: white;
        }
        .cta-text span {
          font-size: 0.75rem;
          color: #10b981;
        }

        .cta-btn {
          background: #10b981;
          color: black;
          font-weight: 700;
          font-size: 0.82rem;
          border: none;
          padding: 8px 14px;
          border-radius: 14px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .track-ad-continue-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-weight: 600;
          font-size: 0.9rem;
          padding: 12px 16px;
          border-radius: 16px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .track-ad-continue-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </>
  );
};

export default TrackLimitAdModal;
