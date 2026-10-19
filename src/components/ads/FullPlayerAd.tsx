"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdBanner } from './AdBanner';
import { recordAdEvent } from '@/lib/adEvents';
import { Gift, Sparkles, ArrowRight } from 'lucide-react';

interface FullPlayerAdProps {
  className?: string;
  onClose?: () => void;
}

export default function FullPlayerAd({ className = '', onClose }: FullPlayerAdProps) {
  const router = useRouter();
  const { isPremium, isLoading, isAuthModalOpen, setIsSubscriptionModalOpen } = useAuth();
  const [status, setStatus] = useState<'loading' | 'filled' | 'unfilled'>('loading');
  const [card, setCard] = useState(0); // the two house promotions take turns in one slot

  useEffect(() => {
    const t = setInterval(() => setCard(c => (c + 1) % 2), 6000);
    return () => clearInterval(t);
  }, []);

  // Timeout: if Google hasn't answered in 4s, mark unfilled so house ads display immediately
  useEffect(() => {
    const t = setTimeout(() => {
      setStatus((prev) => {
        if (prev === 'loading') {
          recordAdEvent('strip', 'no_answer');
          return 'unfilled';
        }
        return prev;
      });
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  if (isLoading || isPremium || isAuthModalOpen) return null;

  const closePlayerAndNavigate = (callback: () => void) => {
    // 1. Call direct prop
    onClose?.();
    // 2. Dispatch events for AppLayout
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('closeFullPlayer'));
      window.dispatchEvent(new CustomEvent('close-full-player'));
    }
    // 3. Execute navigation or modal
    callback();
  };

  const handleInviteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    closePlayerAndNavigate(() => {
      router.push('/earn');
    });
  };

  const handlePremiumClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    closePlayerAndNavigate(() => {
      setIsSubscriptionModalOpen(true);
    });
  };

  const isGoogleAdFilled = status === 'filled';

  return (
    <div
      className={`full-player-ad-wrapper ${className}`}
      aria-label="Promotion"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Google Ad Container: shown when filled OR still loading/trying */}
      {status !== 'unfilled' && (
        <div 
          className="google-ad-slot" 
          style={{ 
            display: isGoogleAdFilled ? 'flex' : 'block',
            position: isGoogleAdFilled ? 'relative' : 'absolute',
            opacity: isGoogleAdFilled ? 1 : 0,
            pointerEvents: isGoogleAdFilled ? 'auto' : 'none',
            zIndex: isGoogleAdFilled ? 2 : -1,
            width: '100%',
            maxWidth: '468px',
          }}
        >
          <span className="full-player-ad-label">AD</span>
          <AdBanner
            variant="auto"
            onStatusChange={(s) => {
              recordAdEvent('strip', s === 'filled' ? 'filled' : 'unfilled');
              setStatus(s);
            }}
            onRequested={() => recordAdEvent('strip', 'requested')}
            onAdClick={() => recordAdEvent('strip', 'click')}
          />
        </div>
      )}

      {/* 2. House Ads (Both Invite & Premium shown side-by-side if Google is unfilled or during loading before fill) */}
      {!isGoogleAdFilled && (
        <div className="house-ads-row animate-in">
          {/* Card 1: Invite a Friend */}
          {card === 0 && <div 
            key="invite"
            className="house-ad-card glass invite-card"
            onClick={handleInviteClick}
            role="button"
            tabIndex={0}
          >
            <div className="house-ad-left">
              <div className="house-ad-icon-box invite-icon-box">
                <Gift size={15} color="#10b981" />
              </div>
              <div className="house-ad-texts">
                <div className="house-ad-title-row">
                  <span className="house-ad-badge invite-badge">GIFT</span>
                  <span className="house-ad-title">Invite a Friend</span>
                </div>
                <span className="house-ad-subtitle">Both get 1 month free</span>
              </div>
            </div>

            <button 
              type="button" 
              className="house-ad-action-btn invite-btn"
            >
              <span>Invite</span>
              <ArrowRight size={12} />
            </button>
          </div>}

          {/* Card 2: Upgrade to Premium */}
          {card === 1 && <div 
            key="premium"
            className="house-ad-card glass premium-card"
            onClick={handlePremiumClick}
            role="button"
            tabIndex={0}
          >
            <div className="house-ad-left">
              <div className="house-ad-icon-box premium-icon-box">
                <Sparkles size={15} color="#f59e0b" />
              </div>
              <div className="house-ad-texts">
                <div className="house-ad-title-row">
                  <span className="house-ad-badge premium-badge">PRO</span>
                  <span className="house-ad-title">Get Premium</span>
                </div>
                <span className="house-ad-subtitle">Ad-free &amp; Finals mode</span>
              </div>
            </div>

            <button 
              type="button" 
              className="house-ad-action-btn premium-btn"
            >
              <span>Upgrade</span>
              <ArrowRight size={12} />
            </button>
          </div>}
        </div>
      )}

      <style jsx>{`
        .full-player-ad-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          padding: 4px 14px;
          margin-bottom: 8px;
          flex-shrink: 0;
          z-index: 10;
        }

        .google-ad-slot {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          min-height: 50px;
        }

        .full-player-ad-label {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
        }

        /* House Ads Row */
        .house-ads-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          max-width: 660px;
        }

        @keyframes house-ad-in { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }

        /* House Ad Card */
        .house-ad-card {
          flex: 1;
          min-width: 0;
          min-height: 46px;
          padding: 7px 14px;
          animation: house-ad-in 0.5s ease;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        }
        .house-ad-card:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-1px);
        }

        .invite-card:hover {
          border-color: rgba(16, 185, 129, 0.4);
        }
        .premium-card:hover {
          border-color: rgba(245, 158, 11, 0.4);
        }

        .house-ad-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1;
        }

        .house-ad-icon-box {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .invite-icon-box {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.35);
        }
        .premium-icon-box {
          background: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.35);
        }

        .house-ad-texts {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
          overflow: hidden;
        }

        .house-ad-title-row {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .house-ad-badge {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.5px;
          padding: 1px 4px;
          border-radius: 3px;
        }
        .invite-badge {
          color: #10b981;
          background: rgba(16, 185, 129, 0.2);
        }
        .premium-badge {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.2);
        }

        .house-ad-title {
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .house-ad-subtitle {
          font-size: 10px;
          color: #a1a1aa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .house-ad-action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          flex-shrink: 0;
          cursor: pointer;
          transition: background 0.2s;
        }
        .invite-btn {
          border-color: rgba(16, 185, 129, 0.4);
        }
        .invite-btn:hover {
          background: rgba(16, 185, 129, 0.25);
        }
        .premium-btn {
          border-color: rgba(245, 158, 11, 0.4);
        }
        .premium-btn:hover {
          background: rgba(245, 158, 11, 0.25);
        }

        @media (max-width: 640px) {
          .house-ads-row {
            flex-direction: column;
            gap: 6px;
            max-width: 380px;
          }
          .house-ad-card {
            padding: 6px 10px;
          }
        }
      `}</style>
    </div>
  );
}
