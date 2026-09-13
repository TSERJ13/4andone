"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type ContactTopic = 'Feedback' | 'Support' | 'Advertising';

export const ContactModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState<ContactTopic>('Feedback');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = () => {
      setIsSuccess(false);
      setErrorMessage(null);
      setIsOpen(true);
    };
    const handleClose = () => setIsOpen(false);

    window.addEventListener('open-contact-modal', handleOpen);
    window.addEventListener('close-contact-modal', handleClose);

    return () => {
      window.removeEventListener('open-contact-modal', handleOpen);
      window.removeEventListener('close-contact-modal', handleClose);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          topic,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setIsSuccess(true);
      setMessage('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="contact-modal-overlay" onClick={handleOverlayClick}>
      <div className="contact-modal-content animate-in-contact" ref={modalRef}>
        {/* Header */}
        <div className="contact-modal-header">
          <div className="contact-brand">
            <div className="contact-icon-box">
              <Mail size={18} />
            </div>
            <div className="contact-title-box">
              <h3>Contact 4and.one</h3>
              <p>Send a note to the team</p>
            </div>
          </div>
          <button
            className="contact-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="contact-modal-body">
          {isSuccess ? (
            <div className="contact-success-state">
              <div className="success-icon-wrapper">
                <CheckCircle2 size={42} className="text-emerald" />
              </div>
              <h4>Message Sent Successfully!</h4>
              <p>
                Thank you for reaching out. We received your note and will get back to you at <strong>{email}</strong> as soon as possible.
              </p>
              <button
                type="button"
                className="btn-done"
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              {/* Topic Selector Tabs */}
              <div className="form-group">
                <label className="field-label">Select Topic</label>
                <div className="topic-tabs">
                  {(['Feedback', 'Support', 'Advertising'] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      className={`topic-tab ${topic === t ? 'active' : ''}`}
                      onClick={() => setTopic(t)}
                    >
                      {t === 'Feedback' && '💡 '}
                      {t === 'Support' && '🛠️ '}
                      {t === 'Advertising' && '📢 '}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Email */}
              <div className="form-row">
                <div className="form-group half">
                  <label className="field-label">Your Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="contact-input"
                    maxLength={60}
                  />
                </div>
                <div className="form-group half">
                  <label className="field-label">Your Email <span className="req">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="contact-input"
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Message */}
              <div className="form-group">
                <label className="field-label">Message <span className="req">*</span></label>
                <textarea
                  required
                  rows={4}
                  placeholder={`Write your ${topic.toLowerCase()} details here...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="contact-textarea"
                  maxLength={2000}
                />
              </div>

              {errorMessage && (
                <div className="contact-error-banner">
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="contact-footer">
                <div />
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim() || !email.trim()}
                  className="submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        .contact-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          cursor: pointer;
        }

        .contact-modal-content {
          width: 100%;
          max-width: 480px;
          background: #111111;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(99, 102, 241, 0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          cursor: default;
          position: relative;
        }

        .contact-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: #161616;
          flex-shrink: 0;
        }

        .contact-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .contact-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #818cf8;
          flex-shrink: 0;
        }

        .contact-title-box h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
          letter-spacing: -0.3px;
        }

        .contact-title-box p {
          margin: 2px 0 0;
          font-size: 11.5px;
          color: #888;
          line-height: 1.2;
        }

        .contact-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #aaa;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .contact-close-btn:hover {
          background: rgba(255, 75, 43, 0.15);
          color: #ff4b2b;
          border-color: rgba(255, 75, 43, 0.3);
        }

        .contact-modal-body {
          padding: 20px 22px;
        }

        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row {
          display: flex;
          gap: 12px;
        }

        .form-group.half {
          flex: 1;
        }

        .field-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #a1a1aa;
          letter-spacing: 0.3px;
        }

        .field-label .req {
          color: #ef4444;
        }

        .topic-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .topic-tab {
          padding: 8px 6px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #888;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          white-space: nowrap;
        }

        .topic-tab:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }

        .topic-tab.active {
          color: #fff;
          background: rgba(99, 102, 241, 0.25);
          border: 1px solid rgba(99, 102, 241, 0.4);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
        }

        .contact-input, .contact-textarea {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 10px 14px;
          color: #fff;
          font-size: 13px;
          font-family: inherit;
          transition: border-color 0.2s, background 0.2s;
          outline: none;
        }

        .contact-input:focus, .contact-textarea:focus {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.06);
        }

        .contact-textarea {
          resize: vertical;
          min-height: 88px;
          line-height: 1.5;
        }

        .contact-error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #ef4444;
          font-size: 12px;
          font-weight: 600;
        }

        .contact-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 4px;
          gap: 12px;
        }

        .direct-email-hint {
          font-size: 11px;
          color: #71717a;
        }

        .direct-email-hint a {
          color: #818cf8;
          text-decoration: underline;
        }

        .submit-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 9999px;
          border: none;
          background: #6366f1;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
        }

        .submit-btn:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .contact-success-state {
          padding: 24px 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .success-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
          margin-bottom: 4px;
        }

        .contact-success-state h4 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          color: #fff;
        }

        .contact-success-state p {
          margin: 0;
          font-size: 13px;
          color: #a1a1aa;
          line-height: 1.5;
          max-width: 360px;
        }

        .contact-success-state strong {
          color: #fff;
        }

        .btn-done {
          margin-top: 8px;
          padding: 9px 28px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-done:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes contactModalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-in-contact {
          animation: contactModalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (max-width: 640px) {
          .contact-modal-overlay {
            padding: 8px 6px;
            padding-top: max(env(safe-area-inset-top, 0px), 16px);
            padding-bottom: 0;
            align-items: flex-end;
          }
          .contact-modal-content {
            max-height: calc(100dvh - env(safe-area-inset-top, 0px) - 24px);
            border-radius: 24px 24px 0 0;
            margin-bottom: 0;
            padding-bottom: max(env(safe-area-inset-bottom, 0px), 16px);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          .contact-modal-header {
            padding: 12px 14px;
          }
          .contact-modal-body {
            padding: 16px 16px;
          }
          .form-row {
            flex-direction: column;
            gap: 12px;
          }
        }

        @media (max-height: 700px) {
          .contact-modal-overlay {
            padding: 4px;
          }
          .contact-modal-content {
            border-radius: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default ContactModal;
