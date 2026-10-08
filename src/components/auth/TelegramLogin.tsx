"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useAuth, TelegramUser } from '@/context/AuthContext';
import { Send } from 'lucide-react';

export const TelegramLogin: React.FC = () => {
  const { login } = useAuth();
  const scriptContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'fourandoneauthbot';
    
    // Define the callback function globally so Telegram can call it
    (window as any).onTelegramAuth = (user: TelegramUser) => {
      login(user);
    };

    if (scriptContainerRef.current) {
      scriptContainerRef.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute('data-telegram-login', botName);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '20');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.async = true;

      script.onload = () => {
        setIsLoaded(true);
      };

      scriptContainerRef.current.appendChild(script);

      // Check if iframe is inserted into DOM
      const observer = new MutationObserver(() => {
        if (scriptContainerRef.current?.querySelector('iframe')) {
          setIsLoaded(true);
        }
      });

      observer.observe(scriptContainerRef.current, { childList: true, subtree: true });

      // Fallback: set loaded after 600ms
      const timer = setTimeout(() => setIsLoaded(true), 600);

      return () => {
        observer.disconnect();
        clearTimeout(timer);
      };
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [login]);

  return (
    <div className="telegram-login-wrapper">
      {!isLoaded && (
        <div className="telegram-instant-placeholder">
          <Send size={16} className="animate-pulse text-sky-400" />
          <span>Connecting Telegram...</span>
        </div>
      )}
      <div 
        ref={scriptContainerRef} 
        id="telegram-script-container" 
        className={`centered-widget ${isLoaded ? 'widget-ready' : 'widget-loading'}`} 
      />
      <style jsx>{`
        .telegram-login-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          min-height: 48px;
          position: relative;
        }
        .telegram-instant-placeholder {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(36, 161, 222, 0.15);
          border: 1px solid rgba(36, 161, 222, 0.3);
          color: #38bdf8;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 20px;
          border-radius: 20px;
          box-shadow: 0 4px 15px rgba(36, 161, 222, 0.2);
          z-index: 1;
        }
        .centered-widget {
          display: flex;
          justify-content: center;
          align-items: center;
          min-width: 200px;
          min-height: 44px;
          background: transparent !important;
          border-radius: 20px;
          overflow: hidden;
          transition: opacity 0.2s ease;
        }
        .widget-loading {
          opacity: 0;
        }
        .widget-ready {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};
