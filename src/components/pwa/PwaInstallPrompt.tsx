"use client";

import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Sparkles, Smartphone } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosTutorial, setShowIosTutorial] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return; // Don't show if already installed as PWA

    // Check iOS detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen for custom trigger event (e.g. from Sidebar install button)
    const handleCustomTrigger = () => {
      if (isIosDevice) {
        setShowIosTutorial(true);
        setIsVisible(true);
      } else if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            setIsVisible(false);
          }
          setDeferredPrompt(null);
        });
      } else {
        setIsVisible(true);
      }
    };
    window.addEventListener('open-pwa-install', handleCustomTrigger);

    // Capture beforeinstallprompt for Android / Chrome / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user previously dismissed prompt recently (last 7 days)
      const dismissedTime = localStorage.getItem('pwa_prompt_dismissed_time');
      if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 7 * 86400 * 1000) {
        return;
      }

      // Show prompt after a short pleasant delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, if not dismissed, show after 8 seconds
    if (isIosDevice) {
      const dismissedTime = localStorage.getItem('pwa_prompt_dismissed_time');
      if (!dismissedTime || Date.now() - parseInt(dismissedTime, 10) >= 7 * 86400 * 1000) {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 8000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('open-pwa-install', handleCustomTrigger);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstallClick = () => {
    if (isIos) {
      setShowIosTutorial(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setIsVisible(false);
        }
        setDeferredPrompt(null);
      });
    } else {
      setShowIosTutorial(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIosTutorial(false);
    localStorage.setItem('pwa_prompt_dismissed_time', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="pwa-install-overlay">
      <div className="pwa-install-card animate-slide-up">
        <button className="pwa-close-btn" onClick={handleDismiss} title="Close">
          <X size={18} />
        </button>

        <div className="pwa-card-header">
          <div className="pwa-icon-wrapper">
            <img src="/icons/icon-192x192.png" alt="4ANDONE" className="pwa-app-icon" />
            <div className="pwa-icon-glow" />
          </div>
          <div className="pwa-text-box">
            <div className="pwa-badge">
              <Sparkles size={12} className="animate-spin-slow text-amber-300" />
              <span>Official App</span>
            </div>
            <h3 className="pwa-title">Install 4ANDONE App</h3>
            <p className="pwa-subtitle">
              Add 4ANDONE to your Home Screen for instant access, full screen player & offline mode.
            </p>
          </div>
        </div>

        {showIosTutorial ? (
          <div className="pwa-ios-instructions">
            <div className="pwa-step">
              <span className="step-num">1</span>
              <p>
                Tap the <strong>Share</strong> button in Safari toolbar:
              </p>
              <Share size={20} className="text-sky-400 animate-bounce inline-block ml-1" />
            </div>
            <div className="pwa-step">
              <span className="step-num">2</span>
              <p>
                Scroll and select <strong>"Add to Home Screen"</strong>:
              </p>
              <PlusSquare size={20} className="text-purple-400 inline-block ml-1" />
            </div>
            <button className="pwa-done-btn" onClick={handleDismiss}>
              Got it
            </button>
          </div>
        ) : (
          <div className="pwa-actions">
            <button className="pwa-install-btn" onClick={handleInstallClick}>
              <Download size={18} />
              <span>Install App</span>
            </button>
            <button className="pwa-later-btn" onClick={handleDismiss}>
              Not Now
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .pwa-install-overlay {
          position: fixed;
          bottom: 84px;
          right: 24px;
          z-index: 9999;
          max-width: 420px;
          width: calc(100vw - 32px);
          pointer-events: auto;
        }

        @media (max-width: 768px) {
          .pwa-install-overlay {
            bottom: 74px;
            left: 16px;
            right: 16px;
            width: auto;
            max-width: 100%;
          }
        }

        .pwa-install-card {
          background: rgba(18, 18, 26, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(168, 85, 247, 0.35);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(168, 85, 247, 0.2);
          position: relative;
          color: #fff;
          overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .pwa-close-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #aaa;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pwa-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .pwa-card-header {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .pwa-icon-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .pwa-app-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
          position: relative;
          z-index: 1;
        }

        .pwa-icon-glow {
          position: absolute;
          inset: -4px;
          border-radius: 18px;
          background: linear-gradient(135deg, #a855f7, #06b6d4);
          opacity: 0.6;
          filter: blur(8px);
          animation: pulseGlow 2.5s infinite alternate;
        }

        @keyframes pulseGlow {
          from { opacity: 0.4; filter: blur(6px); }
          to { opacity: 0.8; filter: blur(12px); }
        }

        .pwa-text-box {
          flex: 1;
          padding-right: 20px;
        }

        .pwa-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: #d8b4fe;
          background: rgba(168, 85, 247, 0.15);
          padding: 2px 8px;
          border-radius: 10px;
          margin-bottom: 6px;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }

        .pwa-title {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 4px 0;
          line-height: 1.25;
        }

        .pwa-subtitle {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
          line-height: 1.4;
        }

        .pwa-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }

        .pwa-install-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          border: none;
          padding: 10px 16px;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .pwa-install-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.6);
        }

        .pwa-later-btn {
          background: rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 10px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .pwa-later-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
        }

        .pwa-ios-instructions {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pwa-step {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #e2e8f0;
        }

        .step-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #a855f7;
          color: #fff;
          font-weight: 700;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .pwa-done-btn {
          margin-top: 6px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
