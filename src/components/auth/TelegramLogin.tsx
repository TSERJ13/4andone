"use client";

import React, { useEffect, useRef } from 'react';
import { useAuth, TelegramUser } from '@/context/AuthContext';

export const TelegramLogin: React.FC = () => {
  const { login } = useAuth();
  const scriptContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'fourandoneauthbot';
    
    // Define the callback function globally so Telegram can call it
    (window as any).onTelegramAuth = (user: TelegramUser) => {
      login(user);
    };

    const script = document.createElement('script');
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    if (scriptContainerRef.current) {
      scriptContainerRef.current.appendChild(script);
    }

    return () => {
      if (scriptContainerRef.current) {
        scriptContainerRef.current.innerHTML = '';
      }
      delete (window as any).onTelegramAuth;
    };
  }, [login]);

  return (
    <div className="telegram-login-wrapper">
      <div ref={scriptContainerRef} id="telegram-script-container" className="centered-widget" />
      <style jsx>{`
        .telegram-login-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          min-height: 44px;
        }
        .centered-widget {
          display: flex;
          justify-content: center;
          min-width: 200px;
          min-height: 40px;
        }
      `}</style>
    </div>
  );
};
