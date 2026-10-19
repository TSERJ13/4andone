"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, X, Sparkles, Bold, Italic, Link2, Code, Smile, 
  Image as ImageIcon, Plus, Trash2, Check, AlertCircle, 
  ExternalLink, User, Crown, BookmarkPlus, Loader2
} from 'lucide-react';
import { telegramPreviewHtml } from '@/utils/telegram-html';

export interface TelegramRecipient {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  is_premium?: boolean;
}

interface SavedTemplate {
  id: string;
  title: string;
  text: string;
  btnText?: string;
  btnUrl?: string;
  photoUrl?: string;
}

const DEFAULT_TEMPLATES: SavedTemplate[] = [
  {
    id: 'tpl_invite',
    title: '🎁 Invite Friend (Free Premium)',
    text: "🎁 <b>Get 1 Month of Free Premium for You & Your Friends!</b>\n\nHello {first_name}! Did you know that you can earn free Premium by inviting your dance partners? Share your personal invite link from 4and.one/earn — when your friend signs in, <b>both you and your friend instantly get 1 month of Premium free!</b> Enjoy ad-free practice, Final Mode, and 320kbps audio together.",
    btnText: '🎁 Invite Friends & Earn Premium',
    btnUrl: 'https://4and.one/earn'
  },
  {
    id: 'tpl_music',
    title: '🎵 New Music',
    text: "🎵 <b>New Music on 4and.one!</b>\n\nHello {first_name}! Fresh Ballroom & Latin tracks and albums have just been added to the library with full tempo (BPM) control. Check out the latest updates and enjoy your dance practice!",
    btnText: '🎵 Open Player',
    btnUrl: 'https://4and.one'
  },
  {
    id: 'tpl_premium',
    title: '👑 Premium Offer',
    text: "👑 <b>Special Offer for {first_name}!</b>\n\nUnlock the full power of 4and.one Premium: 100% ad-free listening, official competition Final Mode with automated fades, offline mode, and studio-grade 320kbps audio. Take your practice to the next level today!",
    btnText: '👑 Activate Premium',
    btnUrl: 'https://4and.one/upgrade'
  },
  {
    id: 'tpl_promo',
    title: '🎟️ Promo Code (Gift)',
    text: "🎁 <b>Special Gift from 4and.one!</b>\n\nHello {first_name}! Here is a gift for you: enjoy free Premium access. Activate your promo code at 4and.one/earn to unlock all premium features free of charge!",
    btnText: '🎟️ Redeem Promo Code',
    btnUrl: 'https://4and.one/earn'
  },
  {
    id: 'tpl_checkin',
    title: '💃 Check-in & Support',
    text: "✨ <b>Hello {first_name}!</b>\n\nThank you for practicing with 4and.one. How is your dance training going? If you have any music requests, questions, or need assistance, feel free to message us anytime!",
    btnText: '🎵 4and.one Player',
    btnUrl: 'https://4and.one'
  }
];

const QUICK_EMOJIS = ['🎵', '🎶', '💃', '🕺', '🎧', '👑', '🎁', '⭐', '✨', '🔥', '🚀', '📢', '💎', '❤️', '👏', '🏆'];

const TEMPLATES_STORAGE_KEY = '4andone_saved_tg_templates';

interface SendTelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: TelegramRecipient | null;
  onSuccess?: (msg: string) => void;
}

export default function SendTelegramModal({
  isOpen,
  onClose,
  user,
  onSuccess
}: SendTelegramModalProps) {
  const [messageText, setMessageText] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [showButtonInput, setShowButtonInput] = useState(false);
  const [btnText, setBtnText] = useState('');
  const [btnUrl, setBtnUrl] = useState('');
  const [customTemplates, setCustomTemplates] = useState<SavedTemplate[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved custom templates from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        setCustomTemplates(JSON.parse(stored));
      }
    } catch { /* ignore */ }
  }, []);

  // Reset modal state when user changes
  useEffect(() => {
    if (user) {
      setError(null);
      setSuccess(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const insertTextAtCursor = (textToInsert: string) => {
    const el = textareaRef.current;
    if (!el) {
      setMessageText(prev => prev + textToInsert);
      return;
    }

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const val = el.value;

    const nextVal = val.slice(0, start) + textToInsert + val.slice(end);
    setMessageText(nextVal);

    setTimeout(() => {
      el.focus();
      const newPos = start + textToInsert.length;
      el.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const insertFormat = (tag: 'b' | 'i' | 'a' | 'code') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = el.value.slice(start, end);

    if (tag === 'b') {
      const wrapped = selected ? `<b>${selected}</b>` : '<b>bold</b>';
      insertTextAtCursor(wrapped);
    } else if (tag === 'i') {
      const wrapped = selected ? `<i>${selected}</i>` : '<i>italic</i>';
      insertTextAtCursor(wrapped);
    } else if (tag === 'code') {
      const wrapped = selected ? `<code>${selected}</code>` : '<code>code</code>';
      insertTextAtCursor(wrapped);
    } else if (tag === 'a') {
      const url = prompt('Enter link destination (URL):', 'https://4and.one');
      if (url) {
        const text = selected || 'link text';
        insertTextAtCursor(`<a href="${url}">${text}</a>`);
      }
    }
  };

  const applyTemplate = (tpl: SavedTemplate) => {
    setMessageText(tpl.text);
    if (tpl.photoUrl) {
      setPhotoUrl(tpl.photoUrl);
      setShowPhotoInput(true);
    }
    if (tpl.btnText && tpl.btnUrl) {
      setBtnText(tpl.btnText);
      setBtnUrl(tpl.btnUrl);
      setShowButtonInput(true);
    }
    setError(null);
  };

  const handleSaveCustomTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim() || !messageText.trim()) return;

    const newTpl: SavedTemplate = {
      id: `custom_${Date.now()}`,
      title: newTemplateTitle.trim(),
      text: messageText,
      btnText: btnText.trim() || undefined,
      btnUrl: btnUrl.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
    };

    const updated = [newTpl, ...customTemplates];
    setCustomTemplates(updated);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }

    setNewTemplateTitle('');
    setIsSavingTemplate(false);
  };

  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this template?')) return;
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const handleSend = async () => {
    if (!messageText.trim()) {
      setError('Please enter a message text');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    const buttons: { text: string; url: string }[] = [];
    if (showButtonInput && btnText.trim() && btnUrl.trim()) {
      buttons.push({ text: btnText.trim(), url: btnUrl.trim() });
    }

    try {
      const res = await fetch('/api/admin/telegram/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          target: 'single',
          telegramId: user.telegram_id,
          message: messageText,
          buttons: buttons.length > 0 ? buttons : undefined,
          photoUrl: showPhotoInput && photoUrl.trim() ? photoUrl.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && (data?.success || data?.results?.[0]?.success)) {
        const msg = `Message sent successfully to ${user.first_name}!`;
        setSuccess(msg);
        if (onSuccess) onSuccess(msg);
        setTimeout(() => {
          onClose();
        }, 1400);
      } else {
        const errDetail = data?.error || data?.results?.[0]?.error || 'Failed to send message';
        setError(`Error: ${errDetail}`);
      }
    } catch (err: any) {
      setError(`Connection error: ${err?.message || 'Could not connect to server'}`);
    } finally {
      setSending(false);
    }
  };

  // Preview replacement for variables
  const personalizedPreview = messageText
    .replace(/\{first_name\}/g, user.first_name || 'Dancer')
    .replace(/\{name\}/g, [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Dancer')
    .replace(/\{username\}/g, user.username ? `@${user.username}` : (user.first_name || 'Dancer'));

  return (
    <div className="tg-modal-overlay" onClick={onClose}>
      <div className="tg-modal-box glass animate-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="tg-modal-head">
          <div className="tg-user-summary">
            {user.photo_url ? (
              <img src={user.photo_url} alt="" className="tg-avatar" />
            ) : (
              <div className="tg-avatar placeholder">{user.first_name?.charAt(0) || 'U'}</div>
            )}
            <div>
              <div className="tg-user-title">
                <strong>{user.first_name} {user.last_name || ''}</strong>
                {user.is_premium ? (
                  <span className="badge-premium"><Crown size={12} /> Premium</span>
                ) : (
                  <span className="badge-free">Free User</span>
                )}
              </div>
              <div className="tg-user-sub">
                {user.username ? (
                  <a href={`https://t.me/${user.username}`} target="_blank" rel="noopener noreferrer" className="tg-handle">
                    @{user.username} <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="tg-id">ID: {user.telegram_id}</span>
                )}
                {user.username && <span className="tg-id-sep">· ID: {user.telegram_id}</span>}
              </div>
            </div>
          </div>
          <button type="button" className="tg-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body Container */}
        <div className="tg-modal-body">
          {/* Templates Section */}
          <div className="tg-section">
            <div className="tg-section-head">
              <span className="tg-section-label">⚡ Templates:</span>
              {!isSavingTemplate ? (
                <button
                  type="button"
                  className="tg-save-tpl-btn"
                  onClick={() => setIsSavingTemplate(true)}
                  disabled={!messageText.trim()}
                  title="Save current text as template"
                >
                  <BookmarkPlus size={13} />
                  <span>Save as Template</span>
                </button>
              ) : null}
            </div>

            {/* Save Template Inline Form */}
            {isSavingTemplate && (
              <form onSubmit={handleSaveCustomTemplate} className="tg-inline-save-form animate-in">
                <input
                  type="text"
                  className="tg-input"
                  placeholder="Template title (e.g. 50% Off Promo)..."
                  value={newTemplateTitle}
                  onChange={e => setNewTemplateTitle(e.target.value)}
                  autoFocus
                  required
                />
                <button type="submit" className="tg-btn primary sm" disabled={!newTemplateTitle.trim()}>
                  Save
                </button>
                <button type="button" className="tg-btn sm" onClick={() => setIsSavingTemplate(false)}>
                  Cancel
                </button>
              </form>
            )}

            {/* Template Chips */}
            <div className="tg-chips-scroll">
              {DEFAULT_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  className="tg-chip"
                  onClick={() => applyTemplate(tpl)}
                >
                  {tpl.title}
                </button>
              ))}

              {customTemplates.map(tpl => (
                <div key={tpl.id} className="tg-chip custom">
                  <span onClick={() => applyTemplate(tpl)} className="tg-chip-label">
                    ⭐ {tpl.title}
                  </span>
                  <button
                    type="button"
                    className="tg-chip-del"
                    onClick={(e) => handleDeleteCustomTemplate(tpl.id, e)}
                    title="Delete template"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Editor & Preview Grid */}
          <div className="tg-editor-grid">
            {/* Left: Composer */}
            <div className="tg-composer">
              {/* Variable Helper Pills */}
              <div className="tg-vars-row">
                <span className="tg-vars-label">Variables:</span>
                <button type="button" className="tg-var-pill" onClick={() => insertTextAtCursor('{first_name}')} title="Insert first name">
                  +{'{first_name}'}
                </button>
                <button type="button" className="tg-var-pill" onClick={() => insertTextAtCursor('{name}')} title="Insert full name">
                  +{'{name}'}
                </button>
                <button type="button" className="tg-var-pill" onClick={() => insertTextAtCursor('{username}')} title="Insert Telegram @username">
                  +{'{username}'}
                </button>
              </div>

              {/* Toolbar */}
              <div className="tg-toolbar">
                <div className="tg-format-group">
                  <button type="button" className="tg-tool-btn" onClick={() => insertFormat('b')} title="Bold">
                    <Bold size={14} />
                  </button>
                  <button type="button" className="tg-tool-btn" onClick={() => insertFormat('i')} title="Italic">
                    <Italic size={14} />
                  </button>
                  <button type="button" className="tg-tool-btn" onClick={() => insertFormat('a')} title="Link">
                    <Link2 size={14} />
                  </button>
                  <button type="button" className="tg-tool-btn" onClick={() => insertFormat('code')} title="Monospace code">
                    <Code size={14} />
                  </button>
                </div>

                {/* Quick Emoji Bar */}
                <div className="tg-emojis-bar">
                  {QUICK_EMOJIS.slice(0, 10).map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="tg-emoji-btn"
                      onClick={() => insertTextAtCursor(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                className="tg-textarea"
                placeholder={`Write a message for ${user.first_name}... (HTML tags supported: <b>, <i>, <code>, <a href="...">)...`}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                rows={7}
              />
              <div className="tg-char-count">
                {messageText.length} characters · Telegram HTML formatting
              </div>

              {/* Extras Row (Photo + Button Toggles) */}
              <div className="tg-extras-toggles">
                <button
                  type="button"
                  className={`tg-extra-toggle ${showPhotoInput ? 'active' : ''}`}
                  onClick={() => setShowPhotoInput(!showPhotoInput)}
                >
                  <ImageIcon size={14} />
                  <span>{showPhotoInput ? 'Remove Photo' : '+ Add Photo'}</span>
                </button>

                <button
                  type="button"
                  className={`tg-extra-toggle ${showButtonInput ? 'active' : ''}`}
                  onClick={() => setShowButtonInput(!showButtonInput)}
                >
                  <ExternalLink size={14} />
                  <span>{showButtonInput ? 'Remove Button' : '+ Add Button'}</span>
                </button>
              </div>

              {/* Photo Input */}
              {showPhotoInput && (
                <div className="tg-extra-field animate-in">
                  <label className="tg-field-label">Photo URL (direct public image link):</label>
                  <input
                    type="url"
                    className="tg-input"
                    placeholder="https://example.com/banner.jpg"
                    value={photoUrl}
                    onChange={e => setPhotoUrl(e.target.value)}
                  />
                </div>
              )}

              {/* Button Input */}
              {showButtonInput && (
                <div className="tg-extra-fields-row animate-in">
                  <div className="tg-extra-field">
                    <label className="tg-field-label">Button Text:</label>
                    <input
                      type="text"
                      className="tg-input"
                      placeholder="e.g. 🎁 Get Free Premium"
                      value={btnText}
                      onChange={e => setBtnText(e.target.value)}
                    />
                  </div>
                  <div className="tg-extra-field">
                    <label className="tg-field-label">Button Link (URL):</label>
                    <input
                      type="url"
                      className="tg-input"
                      placeholder="https://4and.one/earn"
                      value={btnUrl}
                      onChange={e => setBtnUrl(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right: Live Telegram Preview */}
            <div className="tg-preview-pane">
              <div className="tg-preview-label">
                📱 Telegram Live Preview:
              </div>
              <div className="tg-preview-screen">
                <div className="tg-bubble">
                  {showPhotoInput && photoUrl.trim() && (
                    <div className="tg-bubble-photo">
                      <img src={photoUrl.trim()} alt="" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                    </div>
                  )}

                  <div
                    className="tg-bubble-text"
                    dangerouslySetInnerHTML={{
                      __html: telegramPreviewHtml(personalizedPreview || '<i>Message text will appear here...</i>')
                    }}
                  />

                  <div className="tg-bubble-time">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {showButtonInput && btnText.trim() && (
                  <div className="tg-bubble-btn-wrapper">
                    <div className="tg-bubble-btn">
                      {btnText.trim()} <ExternalLink size={12} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="tg-alert error animate-in">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="tg-alert success animate-in">
              <Check size={16} />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="tg-modal-foot">
          <button type="button" className="tg-btn" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button
            type="button"
            className="tg-btn primary"
            onClick={handleSend}
            disabled={sending || !messageText.trim()}
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Send to Telegram</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .tg-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .tg-modal-box {
          background: #111116;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          max-width: 920px;
          width: 100%;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.1);
          color: #fff;
        }

        .tg-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .tg-user-summary {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .tg-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .tg-avatar.placeholder {
          background: linear-gradient(135deg, #0284c7, #38bdf8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 18px;
          color: white;
        }

        .tg-user-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
        }

        .badge-premium {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fbbf24;
          font-size: 11px;
          font-weight: 700;
        }

        .badge-free {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #a1a1aa;
          font-size: 11px;
          font-weight: 600;
        }

        .tg-user-sub {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #71717a;
          margin-top: 2px;
        }

        .tg-handle {
          color: #38bdf8;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .tg-handle:hover {
          text-decoration: underline;
        }

        .tg-close-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #a1a1aa;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .tg-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }

        .tg-modal-body {
          padding: 20px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .tg-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .tg-section-label {
          font-size: 13px;
          font-weight: 700;
          color: #d4d4d8;
        }

        .tg-save-tpl-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 1px dashed rgba(56, 189, 248, 0.4);
          color: #38bdf8;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tg-save-tpl-btn:hover:not(:disabled) {
          background: rgba(56, 189, 248, 0.1);
          border-style: solid;
        }

        .tg-save-tpl-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .tg-inline-save-form {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
          background: rgba(255, 255, 255, 0.03);
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .tg-chips-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .tg-chips-scroll::-webkit-scrollbar {
          height: 4px;
        }
        .tg-chips-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }

        .tg-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          padding: 6px 14px;
          color: #e4e4e7;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tg-chip:hover {
          background: rgba(56, 189, 248, 0.15);
          border-color: rgba(56, 189, 248, 0.4);
          color: #38bdf8;
        }

        .tg-chip.custom {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.3);
          color: #fbbf24;
        }

        .tg-chip-label {
          cursor: pointer;
        }

        .tg-chip-del {
          background: transparent;
          border: none;
          color: #a1a1aa;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 50%;
        }

        .tg-chip-del:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.2);
        }

        .tg-editor-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 18px;
        }

        @media (max-width: 800px) {
          .tg-editor-grid {
            grid-template-columns: 1fr;
          }
        }

        .tg-composer {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tg-vars-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .tg-vars-label {
          font-size: 12px;
          color: #a1a1aa;
        }

        .tg-var-pill {
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.25);
          color: #38bdf8;
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 11px;
          font-family: monospace;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tg-var-pill:hover {
          background: rgba(56, 189, 248, 0.22);
          border-color: #38bdf8;
        }

        .tg-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 4px 8px;
          gap: 8px;
        }

        .tg-format-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tg-tool-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: #d4d4d8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .tg-tool-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .tg-emojis-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
        }

        .tg-emoji-btn {
          background: transparent;
          border: none;
          font-size: 15px;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
          transition: transform 0.15s;
        }

        .tg-emoji-btn:hover {
          transform: scale(1.2);
        }

        .tg-textarea {
          width: 100%;
          background: #09090c;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 12px 14px;
          color: #fff;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          font-family: inherit;
        }

        .tg-textarea:focus {
          outline: none;
          border-color: rgba(56, 189, 248, 0.6);
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.15);
        }

        .tg-char-count {
          font-size: 11px;
          color: #71717a;
          text-align: right;
        }

        .tg-extras-toggles {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tg-extra-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 6px 12px;
          color: #a1a1aa;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tg-extra-toggle:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        .tg-extra-toggle.active {
          background: rgba(56, 189, 248, 0.12);
          border-color: rgba(56, 189, 248, 0.4);
          color: #38bdf8;
        }

        .tg-extra-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tg-extra-fields-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .tg-field-label {
          font-size: 11px;
          font-weight: 600;
          color: #a1a1aa;
        }

        .tg-input {
          background: #09090c;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 8px 12px;
          color: #fff;
          font-size: 13px;
        }

        .tg-input:focus {
          outline: none;
          border-color: rgba(56, 189, 248, 0.6);
        }

        /* Preview Pane */
        .tg-preview-pane {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tg-preview-label {
          font-size: 12px;
          font-weight: 700;
          color: #a1a1aa;
        }

        .tg-preview-screen {
          background: #0f141c;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 8px;
          background-image: radial-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px);
          background-size: 12px 12px;
          min-height: 220px;
        }

        .tg-bubble {
          background: #182533;
          border-radius: 12px 12px 12px 4px;
          padding: 10px 12px;
          color: #fff;
          max-width: 100%;
          align-self: flex-start;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .tg-bubble-photo img {
          max-width: 100%;
          border-radius: 8px;
          margin-bottom: 8px;
          display: block;
        }

        .tg-bubble-text {
          font-size: 13px;
          line-height: 1.45;
          word-break: break-word;
        }

        .tg-bubble-time {
          font-size: 10px;
          color: #6c7883;
          text-align: right;
          margin-top: 4px;
        }

        .tg-bubble-btn-wrapper {
          align-self: flex-start;
          width: 100%;
        }

        .tg-bubble-btn {
          background: #2b5278;
          color: #fff;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .tg-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
        }

        .tg-alert.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .tg-alert.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #6ee7b7;
        }

        .tg-modal-foot {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .tg-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tg-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.14);
        }

        .tg-btn.primary {
          background: #0284c7;
          border-color: #38bdf8;
          color: #fff;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
        }

        .tg-btn.primary:hover:not(:disabled) {
          background: #0369a1;
        }

        .tg-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tg-btn.sm {
          padding: 6px 12px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
