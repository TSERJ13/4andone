"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdBanner } from './AdBanner';
import { recordAdEvent } from '@/lib/adEvents';
import { Gift, Sparkles, Trophy, ArrowRight } from 'lucide-react';

interface Promo {
  id: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  btnText: string;
  action: 'earn' | 'premium' | 'finals';
}

export default function FullPlayerAd({ className = '' }: { className?: string }) {
  const router = useRouter();
  const { isPremium, isLoading, setIsSubscriptionModalOpen } = useAuth();
  const [status, setStatus] = useState<'loading' | 'filled' | 'unfilled'>('loading');
  const [promoIndex, setPromoIndex] = useState(0);

  const promos: Promo[] = useMemo(() => [
    {
      id: 'invite',
      badge: 'GIFT',
      badgeColor: '#10b981',
      icon: <Gift size={15} color="#10b981" />,
      title: 'Invite a Friend, Both Get 1 Month Free',
      subtitle: 'Share your link with dance partners',
      btnText: 'Invite',
      action: 'earn',
    },
    {
      id: 'premium',
      badge: 'PRO',
      badgeColor: '#f59e0b',
      icon: <Sparkles size={15} color="#f59e0b" />,
      title: 'Upgrade to 4and.one Premium',
      subtitle: 'Ad-free listening & full Final Mode',
      btnText: 'Upgrade',
      action: 'premium',
    },
    {
      id: 'finals',
      badge: 'FINAL',
      badgeColor: '#38bdf8',
      icon: <Trophy size={15} color="#38bdf8" />,
      title: 'Practice with Real Competition Finals',
      subtitle: '5-dance simulation with 15s rest pauses',
      btnText: 'Try Finals',
      action: 'finals',
    },
  ], []);

  // Pick a promo based on random or rotation
  useEffect(() => {
    setPromoIndex(Math.floor(Math.random() * promos.length));
  }, [promos.length]);

  // Timeout: if Google hasn't answered in 4s, mark unfilled so house ad displays immediately
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

  if (isLoading || isPremium) return null;

  const currentPromo = promos[promoIndex] || promos[0];

  const handlePromoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPromo.action === 'earn') {
      router.push('/earn');
    } else if (currentPromo.action === 'premium') {
      setIsSubscriptionModalOpen(true);
    } else if (currentPromo.action === 'finals') {
      router.push('/library/finals');
    }
  };

  const isGoogleAdFilled = status === 'filled';

  return (
    <div
      className={`full-player-ad-wrapper ${className}`}
      aria-label="Promotion"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Google Ad Container (rendered if filled) */}
      <div 
        className="google-ad-slot" 
        style={{ display: isGoogleAdFilled ? 'flex' : 'none' }}
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

      {/* 2. House Ad Container (rendered when Google is loading or unfilled) */}
      {!isGoogleAdFilled && (
        <div 
          className="house-ad-card glass animate-in"
          onClick={handlePromoClick}
          role="button"
          tabIndex={0}
        >
          <div className="house-ad-left">
            <div 
              className="house-ad-icon-box"
              style={{ background: `${currentPromo.badgeColor}20`, borderColor: `${currentPromo.badgeColor}40` }}
            >
              {currentPromo.icon}
            </div>
            <div className="house-ad-texts">
              <div className="house-ad-title-row">
                <span 
                  className="house-ad-badge"
                  style={{ color: currentPromo.badgeColor, background: `${currentPromo.badgeColor}22` }}
                >
                  {currentPromo.badge}
                </span>
                <span className="house-ad-title">{currentPromo.title}</span>
              </div>
              <span className="house-ad-subtitle">{currentPromo.subtitle}</span>
            </div>
          </div>

          <button 
            type="button" 
            className="house-ad-action-btn"
            style={{ borderColor: `${currentPromo.badgeColor}50` }}
          >
            <span>{currentPromo.btnText}</span>
            <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Hidden AdSense requester if not yet filled */}
      {!isGoogleAdFilled && (
        <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }}>
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

      <style jsx>{`
        .full-player-ad-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          padding: 4px 16px;
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

        /* House Ad Card */
        .house-ad-card {
          width: 100%;
          max-width: 440px;
          padding: 8px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        }
        .house-ad-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.18);
          transform: translateY(-1px);
        }

        .house-ad-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }

        .house-ad-icon-box {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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
          gap: 6px;
        }

        .house-ad-badge {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.5px;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .house-ad-title {
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .house-ad-subtitle {
          font-size: 11px;
          color: #a1a1aa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .house-ad-action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
          cursor: pointer;
          transition: background 0.2s;
        }
        .house-ad-action-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}
