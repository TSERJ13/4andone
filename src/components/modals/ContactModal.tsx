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
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          cursor: pointer;
        }

        .contact-modal-content {
          width: 100%;
          max-width: 440px;
          background: #212121;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          cursor: default;
          position: relative;
          color: #ffffff;
        }

        .contact-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: #272727;
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
          border-radius: 50%;
          background: rgba(255, 0, 51, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff0033;
          flex-shrink: 0;
        }

        .contact-title-box h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
        }

        .contact-title-box p {
          margin: 2px 0 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.2;
        }

        .contact-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .contact-close-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          color: #ffffff;
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
          color: rgba(255, 255, 255, 0.7);
          letter-spacing: 0.3px;
        }

        .field-label .req {
          color: #ff0033;
        }

        .topic-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          background: #272727;
          padding: 4px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .topic-tab {
          padding: 8px 6px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
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
          background: rgba(255, 255, 255, 0.08);
        }

        .topic-tab.active {
          color: #fff;
          background: rgba(255, 0, 51, 0.15);
          border: 1px solid #ff0033;
        }

        .contact-input, .contact-textarea {
          background: #272727;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 14px;
          color: #fff;
          font-size: 13px;
          font-family: inherit;
          transition: border-color 0.2s;
          outline: none;
        }

        .contact-input:focus, .contact-textarea:focus {
          border-color: #ff0033;
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
          background: rgba(255, 0, 51, 0.12);
          border: 1px solid rgba(255, 0, 51, 0.25);
          color: #ff4b2b;
          font-size: 12px;
          font-weight: 600;
        }

        .contact-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-top: 4px;
        }

        .submit-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          border-radius: 20px;
          border: none;
          background: #ff0033;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(255, 0, 51, 0.3);
        }

        .submit-btn:hover:not(:disabled) {
          background: #cc0029;
          transform: scale(1.02);
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
          background: rgba(34, 197, 94, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #22c55e;
          margin-bottom: 4px;
        }

        .contact-success-state h4 {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
          color: #fff;
        }

        .contact-success-state p {
          margin: 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.5;
          max-width: 360px;
        }

        .btn-done {
          margin-top: 8px;
          padding: 10px 24px;
          border-radius: 20px;
          background: #ff0033;
          border: none;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-done:hover {
          background: #cc0029;
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
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-in-contact {
          animation: contactModalFadeIn 0.25s cubic-bezier(0.19, 1, 0.22, 1);
        }

        @media (max-width: 640px) {
          .contact-modal-content {
            border-radius: 16px;
          }
          .form-row {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default ContactModal;
