"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Download, Share, PlusSquare, X, MoreVertical } from 'lucide-react';

const DISMISS_KEY = 'pwa_prompt_dismissed_time';
const DISMISS_MS = 7 * 86400 * 1000;

const dismissedRecently = () => {
  try {
    const t = localStorage.getItem(DISMISS_KEY);
    return !!t && Date.now() - parseInt(t, 10) < DISMISS_MS;
  } catch {
    return false;
  }
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PwaInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const isIosRef = useRef(false); // only read in click handlers
  const [showIosTutorial, setShowIosTutorial] = useState(false);
  // Browsers without an install prompt (desktop Safari, Firefox…): menu steps
  const [showManualSteps, setShowManualSteps] = useState(false);
  // The captured install prompt lives in a ref so the listeners below are
  // registered once (they were re-added on every change, and on iOS the
  // early `return` skipped removing them).
  const deferredPromptRef = useRef<InstallPromptEvent | null>(null);

  const runNativePrompt = () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return false;
    prompt.prompt();
    prompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') setIsVisible(false);
      deferredPromptRef.current = null;
    }).catch(() => { deferredPromptRef.current = null; });
    return true;
  };

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    const ua = window.navigator.userAgent.toLowerCase();
    // iPadOS 13+ reports itself as a Mac — detect it by touch support
    const isIosDevice = /iphone|ipad|ipod/.test(ua) ||
      (ua.includes('macintosh') && navigator.maxTouchPoints > 1);
    isIosRef.current = isIosDevice;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // "Install App" in the side menu
    const handleCustomTrigger = () => {
      if (isStandalone) return; // already installed
      if (isIosDevice) {
        setShowIosTutorial(true);
        setIsVisible(true);
      } else if (!runNativePrompt()) {
        setShowManualSteps(true);
        setIsVisible(true);
      }
    };
    window.addEventListener('open-pwa-install', handleCustomTrigger);

    // Android / Chrome / Edge desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as InstallPromptEvent;
      if (isStandalone || dismissedRecently()) return;
      timers.push(setTimeout(() => setIsVisible(true), 5000));
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleInstalled = () => {
      deferredPromptRef.current = null;
      setIsVisible(false);
    };
    window.addEventListener('appinstalled', handleInstalled);

    // iOS has no install prompt: offer the steps once in a while
    if (isIosDevice && !isStandalone && !dismissedRecently()) {
      timers.push(setTimeout(() => setIsVisible(true), 8000));
    }

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('open-pwa-install', handleCustomTrigger);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallClick = () => {
    if (isIosRef.current) {
      setShowIosTutorial(true);
      return;
    }
    if (!runNativePrompt()) setShowManualSteps(true);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIosTutorial(false);
    setShowManualSteps(false);
    try { localStorage.setItem(DISMISS_KEY, Date.now().toString()); } catch { /* ignore */ }
  };

  if (!isVisible) return null;

  const steps: { text: React.ReactNode; icon: React.ReactNode }[] = showIosTutorial
    ? [
        { text: <>Tap <strong>Share</strong> in the Safari toolbar</>, icon: <Share size={18} /> },
        { text: <>Choose <strong>Add to Home Screen</strong></>, icon: <PlusSquare size={18} /> },
        { text: <>Tap <strong>Add</strong> in the top corner</>, icon: null },
      ]
    : [
        { text: <>Open your browser <strong>menu</strong></>, icon: <MoreVertical size={18} /> },
        { text: <>Choose <strong>Install app</strong> or <strong>Add to Home Screen</strong></>, icon: <PlusSquare size={18} /> },
      ];
  const showSteps = showIosTutorial || showManualSteps;

  return (
    <div className="pwa-install-overlay" role="dialog" aria-label="Install 4ANDONE">
      <div className="pwa-card">
        <button type="button" className="pwa-close" onClick={handleDismiss} aria-label="Close">
          <X size={18} />
        </button>

        <div className="pwa-head">
          <img src="/icons/icon-192x192.png" alt="" className="pwa-icon" />
          <div>
            <h3 className="pwa-title">Add 4ANDONE to your Home Screen</h3>
            <p className="pwa-sub">Opens full screen like an app and plays your downloads offline.</p>
          </div>
        </div>

        {showSteps ? (
          <>
            <ol className="pwa-steps">
              {steps.map((step, i) => (
                <li key={i} className="pwa-step">
                  <span className="pwa-num">{i + 1}</span>
                  <span className="pwa-step-text">{step.text}</span>
                  {step.icon && <span className="pwa-step-icon">{step.icon}</span>}
                </li>
              ))}
            </ol>
            <button type="button" className="pwa-primary" onClick={handleDismiss}>
              Got it
            </button>
          </>
        ) : (
          <div className="pwa-actions">
            <button type="button" className="pwa-secondary" onClick={handleDismiss}>
              Not now
            </button>
            <button type="button" className="pwa-primary" onClick={handleInstallClick}>
              <Download size={16} />
              <span>Install</span>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .pwa-install-overlay {
          position: fixed;
          /* above the player bar (72px) + the sticky ad strip (~60px) */
          bottom: 148px;
          right: 24px;
          z-index: 9999;
          width: 360px;
          max-width: calc(100vw - 32px);
        }
        @media (max-width: 768px) {
          .pwa-install-overlay {
            /* above bottom nav (56) + mini player (60) + ad strip (~60) */
            bottom: calc(184px + env(safe-area-inset-bottom, 0px));
            left: 16px;
            right: 16px;
            width: auto;
            max-width: none;
          }
        }

        .pwa-card {
          position: relative;
          background: #1f1f1f;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px;
          color: #ffffff;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
          animation: pwaIn 0.25s ease-out;
        }
        @keyframes pwaIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pwa-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 50%;
          background: transparent;
          color: #aaaaaa;
          cursor: pointer;
        }
        .pwa-close:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .pwa-head {
          display: flex;
          gap: 14px;
          align-items: center;
          padding-right: 28px;
        }
        .pwa-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          flex-shrink: 0;
        }
        .pwa-title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.3;
        }
        .pwa-sub {
          margin: 4px 0 0;
          font-size: 13px;
          line-height: 1.45;
          color: #aaaaaa;
        }

        .pwa-steps {
          list-style: none;
          margin: 18px 0 0;
          padding: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .pwa-step {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 14px;
          color: #e5e5e5;
        }
        .pwa-num {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
        }
        .pwa-step-text {
          flex: 1;
        }
        .pwa-step-text :global(strong) {
          color: #ffffff;
          font-weight: 600;
        }
        .pwa-step-icon {
          display: flex;
          color: #aaaaaa;
        }

        .pwa-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 18px;
        }
        .pwa-primary,
        .pwa-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 40px;
          padding: 0 18px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }
        .pwa-primary {
          background: #ffffff;
          color: #0f0f0f;
        }
        .pwa-primary:hover {
          background: #e5e5e5;
        }
        .pwa-secondary {
          background: transparent;
          color: #ffffff;
        }
        .pwa-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .pwa-steps + .pwa-primary {
          width: 100%;
          margin-top: 16px;
        }
      `}</style>
    </div>
  );
}
