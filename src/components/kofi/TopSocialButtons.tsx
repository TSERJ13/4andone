"use client";

import React from 'react';
import { Mail, Send } from 'lucide-react';
import { KofiButton } from './KofiButton';

export { TopSocialMenu } from './TopSocialMenu';

interface TopSocialButtonsProps {
  className?: string;
}

export const TopSocialButtons: React.FC<TopSocialButtonsProps> = ({ className = '' }) => {
  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('open-contact-modal'));
  };

  return (
    <div className={`top-social-buttons-cluster ${className}`}>
      {/* 1. Buy Me Coffee Pill */}
      <KofiButton />

      {/* 2. Telegram Link Button */}
      <a
        href="https://t.me/fourandonemusic"
        target="_blank"
        rel="noopener noreferrer"
        className="social-pill-btn tg-pill"
        title="Join 4and.one Telegram Community"
        aria-label="Telegram"
      >
        <span className="pill-icon-wrapper tg-icon">
          <Send size={15} />
        </span>
        <span className="pill-text">Telegram</span>
      </a>

      {/* 3. YouTube Link Button */}
      <a
        href="https://www.youtube.com/@4andone"
        target="_blank"
        rel="noopener noreferrer"
        className="social-pill-btn yt-pill"
        title="4and.one YouTube Channel"
        aria-label="YouTube"
      >
        <span className="pill-icon-wrapper yt-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </span>
        <span className="pill-text">YouTube</span>
      </a>

      {/* 4. Contact Message Button */}
      <button
        type="button"
        onClick={handleContactClick}
        className="social-pill-btn msg-pill"
        title="Send a Message to 4and.one"
        aria-label="Contact Us"
      >
        <span className="pill-icon-wrapper msg-icon">
          <Mail size={15} />
        </span>
        <span className="pill-text">Message</span>
      </button>

      <style jsx>{`
        .top-social-buttons-cluster {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .social-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 14px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #ffffff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: -0.2px;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          user-select: none;
          text-decoration: none;
          white-space: nowrap;
        }

        /* Telegram Pill Styling */
        .tg-pill {
          border: 1px solid rgba(0, 136, 204, 0.35);
        }
        .tg-pill:hover {
          background: rgba(0, 136, 204, 0.15);
          border-color: #0088cc;
          box-shadow: 0 0 18px rgba(0, 136, 204, 0.4), 0 2px 8px rgba(0, 0, 0, 0.5);
          transform: translateY(-1px);
        }
        .tg-icon {
          color: #29b6f6;
          filter: drop-shadow(0 0 4px rgba(0, 136, 204, 0.6));
        }

        /* YouTube Pill Styling */
        .yt-pill {
          border: 1px solid rgba(255, 0, 0, 0.35);
        }
        .yt-pill:hover {
          background: rgba(255, 0, 0, 0.15);
          border-color: #ff0000;
          box-shadow: 0 0 18px rgba(255, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.5);
          transform: translateY(-1px);
        }
        .yt-icon {
          color: #ff3333;
          filter: drop-shadow(0 0 4px rgba(255, 0, 0, 0.6));
        }

        /* Message Pill Styling */
        .msg-pill {
          border: 1px solid rgba(99, 102, 241, 0.35);
        }
        .msg-pill:hover {
          background: rgba(99, 102, 241, 0.15);
          border-color: #6366f1;
          box-shadow: 0 0 18px rgba(99, 102, 241, 0.4), 0 2px 8px rgba(0, 0, 0, 0.5);
          transform: translateY(-1px);
        }
        .msg-icon {
          color: #818cf8;
          filter: drop-shadow(0 0 4px rgba(99, 102, 241, 0.6));
        }

        .pill-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pill-text {
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .top-social-buttons-cluster {
            gap: 6px;
          }
          .social-pill-btn .pill-text {
            display: none !important;
          }
          .social-pill-btn {
            height: 32px;
            width: 32px;
            min-width: 32px;
            padding: 0 !important;
            justify-content: center;
            gap: 0;
          }
          .social-pill-btn.tg-pill,
          .social-pill-btn.yt-pill,
          .social-pill-btn.msg-pill {
            width: 32px;
            height: 32px;
            min-width: 32px;
            padding: 0 !important;
            justify-content: center;
          }
          :global(.kofi-pill-btn) {
            height: 32px !important;
            padding: 0 10px !important;
            font-size: 11.5px !important;
            gap: 6px !important;
          }
        }

        @media (max-width: 440px) {
          .top-social-buttons-cluster {
            gap: 4px;
          }
          .social-pill-btn {
            height: 30px;
            width: 30px;
            min-width: 30px;
          }
          .social-pill-btn.tg-pill,
          .social-pill-btn.yt-pill,
          .social-pill-btn.msg-pill {
            width: 30px;
            height: 30px;
            min-width: 30px;
          }
          :global(.kofi-pill-btn) {
            padding: 0 8px !important;
            height: 30px !important;
            font-size: 11px !important;
            gap: 5px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TopSocialButtons;
