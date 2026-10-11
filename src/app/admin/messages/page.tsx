"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { adminDb } from '@/lib/admin-db';
import { 
  Mail, MessageSquare, Trash2, Reply, RefreshCw, 
  Search, Calendar, User, Clock, CheckCircle2, AlertTriangle, 
  Filter, Send, Users, Sparkles, ExternalLink, ShieldCheck, 
  Bot, AlertCircle 
} from 'lucide-react';
import ConfirmModal from '@/components/admin/ConfirmModal';

interface ContactMessage {
  id: string;
  created_at: string;
  topic: string;
  message: string;
  email: string;
  name: string;
}

interface TelegramUser {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium?: boolean;
}

export default function AdminMessagesPage() {
  const [activeTab, setActiveTab] = useState<'incoming' | 'telegram'>('incoming');
  
  // INCOMING MESSAGES STATE
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    message: ContactMessage | null;
  }>({
    isOpen: false,
    message: null,
  });

  // TELEGRAM BROADCAST / DIRECT MESSAGE STATE
  const [tgUsers, setTgUsers] = useState<TelegramUser[]>([]);
  const [loadingTgUsers, setLoadingTgUsers] = useState(false);
  const [sendTarget, setSendTarget] = useState<'broadcast' | 'single'>('broadcast');
  const [selectedUser, setSelectedUser] = useState<TelegramUser | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [tgMessageText, setTgMessageText] = useState('');
  const [botToken, setBotToken] = useState('');
  const [isSendingTg, setIsSendingTg] = useState(false);
  const [sendResult, setSendResult] = useState<{
    total: number;
    sentCount: number;
    failedCount: number;
    errors?: { id: number; reason: string }[];
  } | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data, error }, { data: delRows }] = await Promise.all([
        adminDb
          .from('track_plays')
          .select('id, created_at, style, bpm, user_ref, session_id')
          .eq('event_type', 'contact_message')
          .order('created_at', { ascending: false }),
        supabase
          .from('folders')
          .select('color')
          .eq('name', '__deleted_msg__')
      ]);

      if (error) throw error;

      const deletedIds = new Set((delRows || []).map(r => r.color));
      const activeRaw = (data || []).filter((r: any) => !deletedIds.has(r.id));

      const formatted: ContactMessage[] = activeRaw.map((r: any) => {
        const rawStyle = r.style || '';
        let topic = 'General';
        let body = rawStyle;

        if (rawStyle.includes(': ')) {
          const split = rawStyle.split(': ');
          topic = split[0].replace(/^\[|\]$/g, '').trim();
          body = split.slice(1).join(': ').trim();
        }

        return {
          id: r.id,
          created_at: r.created_at,
          topic,
          message: body || rawStyle,
          email: r.bpm || r.session_id || 'No email provided',
          name: r.user_ref || 'Anonymous',
        };
      });

      setMessages(formatted);
    } catch (err: any) {
      console.error('Failed to load contact messages:', err);
      setFeedback({ type: 'error', text: `Failed to load messages: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTgUsers = useCallback(async () => {
    setLoadingTgUsers(true);
    try {
      const { data, error } = await adminDb
        .from('telegram_users')
        .select('telegram_id, first_name, last_name, username, is_premium')
        .order('visit_count', { ascending: false })
        .limit(1000);
      if (!error && data) {
        setTgUsers(data as TelegramUser[]);
      }
    } catch (err) {
      console.error('Failed to load telegram users', err);
    } finally {
      setLoadingTgUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchTgUsers();
    const savedToken = localStorage.getItem('4andone_admin_bot_token') || '';
    if (savedToken) setBotToken(savedToken);
  }, [fetchMessages, fetchTgUsers]);

  const handleDelete = async () => {
    if (!deleteModal.message) return;
    const targetId = deleteModal.message.id;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/contact?id=${targetId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete');
      }

      setMessages(prev => prev.filter(m => m.id !== targetId));
      setFeedback({ type: 'success', text: 'Message deleted successfully.' });
      setTimeout(() => setFeedback(null), 4000);
      setDeleteModal({ isOpen: false, message: null });
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendTelegram = async () => {
    if (!tgMessageText.trim()) return;
    if (sendTarget === 'single' && !selectedUser) {
      alert('Please select a Telegram user to message.');
      return;
    }

    setIsSendingTg(true);
    setSendResult(null);

    try {
      const payload: Record<string, any> = {
        message: tgMessageText.trim(),
        target: sendTarget,
        botToken: botToken.trim() || undefined,
      };

      if (sendTarget === 'single' && selectedUser) {
        payload.telegramId = selectedUser.telegram_id;
      }

      const res = await fetch('/api/admin/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to send message');
      }

      if (botToken.trim()) {
        localStorage.setItem('4andone_admin_bot_token', botToken.trim());
      }

      setSendResult({
        total: data.total,
        sentCount: data.sentCount,
        failedCount: data.failedCount,
        errors: data.errors,
      });

      setFeedback({ 
        type: 'success', 
        text: `Sent to ${data.sentCount} user(s). Failed: ${data.failedCount}.` 
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert(`Send Error: ${err.message}`);
    } finally {
      setIsSendingTg(false);
    }
  };

  const applyTemplate = (text: string) => {
    setTgMessageText(text);
  };

  const filteredTgUsers = tgUsers.filter(u => {
    const q = userSearchQuery.toLowerCase();
    if (!q) return true;
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const username = (u.username || '').toLowerCase();
    const id = String(u.telegram_id);
    return name.includes(q) || username.includes(q) || id.includes(q);
  });

  const topics = ['all', ...Array.from(new Set(messages.map(m => m.topic.toLowerCase())))];

  const filteredMessages = messages.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.message.toLowerCase().includes(search.toLowerCase()) ||
      m.topic.toLowerCase().includes(search.toLowerCase());

    const matchesTopic = selectedTopic === 'all' || m.topic.toLowerCase() === selectedTopic;

    return matchesSearch && matchesTopic;
  });

  const getTopicColor = (t: string) => {
    const low = t.toLowerCase();
    if (low.includes('adver')) return { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: 'rgba(234, 179, 8, 0.3)' };
    if (low.includes('feed')) return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
    if (low.includes('supp') || low.includes('help')) return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
    return { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' };
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return 'just now';
  };

  return (
    <div className="admin-messages-page animate-in" style={{ padding: '8px 4px 60px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MessageSquare size={28} color="#38bdf8" />
            Communication &amp; Messages
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '13px', marginTop: '4px' }}>
            Manage user inquiries and send direct or broadcast Telegram messages via Bot.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="tab-switcher glass">
          <button
            className={`tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('incoming')}
          >
            <Mail size={16} />
            <span>Inquiries ({messages.length})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'telegram' ? 'active' : ''}`}
            onClick={() => setActiveTab('telegram')}
          >
            <Send size={16} />
            <span>Send Telegram ({tgUsers.length} Users)</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: feedback.type === 'success' ? '#4ade80' : '#f87171',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {feedback.text}
        </div>
      )}

      {/* TAB 1: INCOMING MESSAGES */}
      {activeTab === 'incoming' && (
        <>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px', maxWidth: '500px' }}>
              <div style={{
                position: 'relative',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '0 12px'
              }}>
                <Search size={16} color="#71717a" />
                <input
                  type="text"
                  placeholder="Search by sender, email or text..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '10px 8px',
                    color: 'white',
                    fontSize: '13px',
                    width: '100%',
                    outline: 'none'
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '12px' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                {topics.map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTopic(t)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: selectedTopic === t ? '#38bdf8' : 'transparent',
                      color: selectedTopic === t ? 'black' : '#a1a1aa'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchMessages}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Messages List */}
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#71717a' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px' }}>Loading inquiries...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <Mail size={32} color="#71717a" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '15px', color: 'white', fontWeight: 700 }}>No Messages Found</h3>
              <p style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>
                {search || selectedTopic !== 'all' ? 'Try adjusting your filter query.' : 'No contact requests have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredMessages.map((msg) => {
                const topicColor = getTopicColor(msg.topic);
                return (
                  <div
                    key={msg.id}
                    className="glass"
                    style={{
                      padding: '18px 20px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: topicColor.bg,
                          color: topicColor.text,
                          border: `1px solid ${topicColor.border}`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {msg.topic}
                        </span>

                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={13} color="#a1a1aa" />
                          {msg.name}
                        </span>

                        <span style={{ fontSize: '12px', color: '#71717a' }}>•</span>

                        <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 600 }}>
                          {msg.email}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} />
                          {timeAgo(msg.created_at)}
                        </span>

                        <button
                          onClick={() => setDeleteModal({ isOpen: true, message: msg })}
                          title="Delete message"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            borderRadius: '8px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      fontSize: '13px',
                      color: '#e4e4e7',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.message}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#71717a' }}>
                      <span>Submitted: {formatDate(msg.created_at)}</span>

                      {msg.email && msg.email.includes('@') && (
                        <a
                          href={`mailto:${msg.email}?subject=Reply from 4and.one: ${msg.topic}&body=Hello ${msg.name},%0D%0A%0D%0A`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#38bdf8',
                            textDecoration: 'none',
                            fontWeight: 700
                          }}
                        >
                          <Reply size={12} />
                          Reply via Email
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: TELEGRAM BOT MESSAGING */}
      {activeTab === 'telegram' && (
        <div className="telegram-panel">
          <div className="tg-layout">
            {/* Left Column: Composer */}
            <div className="tg-composer glass">
              <div className="panel-title-row">
                <Bot size={22} className="text-primary" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'white', margin: 0 }}>
                    Compose Telegram Message
                  </h3>
                  <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '2px 0 0' }}>
                    Messages are delivered directly through your official Telegram Bot.
                  </p>
                </div>
              </div>

              {/* Bot Token Configuration */}
              <div className="form-group">
                <label className="field-label">Telegram Bot Token (from @BotFather)</label>
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Paste your 123456789:ABCdefGhI... bot token"
                  className="input-field"
                />
                <span className="field-hint">
                  {botToken ? '✓ Bot token ready.' : 'Enter your Bot Token once; it is saved in your browser.'}
                </span>
              </div>

              {/* Target Selector */}
              <div className="form-group">
                <label className="field-label">Send To:</label>
                <div className="target-toggle">
                  <button
                    type="button"
                    className={`target-btn ${sendTarget === 'broadcast' ? 'active' : ''}`}
                    onClick={() => {
                      setSendTarget('broadcast');
                      setSelectedUser(null);
                    }}
                  >
                    <Users size={15} />
                    <span>Broadcast to All ({tgUsers.length} Users)</span>
                  </button>
                  <button
                    type="button"
                    className={`target-btn ${sendTarget === 'single' ? 'active' : ''}`}
                    onClick={() => setSendTarget('single')}
                  >
                    <User size={15} />
                    <span>Specific User {selectedUser ? `(${selectedUser.first_name})` : ''}</span>
                  </button>
                </div>
              </div>

              {/* Specific User Selector if single */}
              {sendTarget === 'single' && (
                <div className="form-group user-picker-box">
                  <label className="field-label">Choose Recipient:</label>
                  {selectedUser ? (
                    <div className="selected-user-card">
                      <div className="user-avatar-sm">
                        {selectedUser.first_name?.charAt(0) || 'U'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, color: 'white', fontSize: '13px' }}>
                          {selectedUser.first_name} {selectedUser.last_name || ''}
                        </div>
                        <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                          {selectedUser.username ? `@${selectedUser.username} · ` : ''}ID: {selectedUser.telegram_id}
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="btn-clear-user" 
                        onClick={() => setSelectedUser(null)}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="user-dropdown">
                      <input
                        type="text"
                        placeholder="Search user by name, @username, or Telegram ID..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="input-field-sm"
                      />
                      <div className="user-results-list">
                        {filteredTgUsers.slice(0, 8).map(u => (
                          <div
                            key={u.telegram_id}
                            className="user-option"
                            onClick={() => {
                              setSelectedUser(u);
                              setUserSearchQuery('');
                            }}
                          >
                            <span className="user-opt-name">{u.first_name} {u.last_name || ''}</span>
                            <span className="user-opt-meta">
                              {u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Message Templates */}
              <div className="form-group">
                <label className="field-label">Quick Templates:</label>
                <div className="template-chips">
                  <button
                    type="button"
                    className="template-chip"
                    onClick={() => applyTemplate("🎵 <b>New Tracks Added!</b>\n\nFresh dancesport music has just been uploaded to 4and.one with BPM tempo control. Check them out now at https://4and.one")}
                  >
                    🎵 New Music Update
                  </button>
                  <button
                    type="button"
                    className="template-chip"
                    onClick={() => applyTemplate("⭐ <b>Special Gift from 4and.one!</b>\n\nWe appreciate your support on our platform. Enjoy your ballroom practice sessions!")}
                  >
                    ⭐ Practice Gift
                  </button>
                  <button
                    type="button"
                    className="template-chip"
                    onClick={() => applyTemplate("🎁 <b>Invite a Friend, Get Premium!</b>\n\nInvite your dance partner to 4and.one and you both get 1 month of free Premium! Get your link at https://4and.one/earn")}
                  >
                    🎁 Referral Reminder
                  </button>
                </div>
              </div>

              {/* Message Textarea */}
              <div className="form-group">
                <label className="field-label">
                  Message Text (supports HTML: &lt;b&gt;, &lt;i&gt;, &lt;a href="..."&gt;)
                </label>
                <textarea
                  value={tgMessageText}
                  onChange={(e) => setTgMessageText(e.target.value)}
                  rows={6}
                  placeholder="Type your announcement or personal message here..."
                  className="textarea-field"
                />
              </div>

              {/* Send Button */}
              <button
                type="button"
                className="btn-send-tg"
                onClick={handleSendTelegram}
                disabled={isSendingTg || !tgMessageText.trim() || (sendTarget === 'single' && !selectedUser)}
              >
                {isSendingTg ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Sending to Telegram...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>
                      {sendTarget === 'broadcast' 
                        ? `Broadcast to ${tgUsers.length} Users` 
                        : `Send to ${selectedUser?.first_name || 'User'}`}
                    </span>
                  </>
                )}
              </button>

              {/* Send Result Breakdown */}
              {sendResult && (
                <div className="send-result-card">
                  <div style={{ fontWeight: 800, fontSize: '13px', color: 'white', marginBottom: '4px' }}>
                    Delivery Report:
                  </div>
                  <div style={{ fontSize: '12px', color: '#4ade80' }}>
                    ✓ Successfully delivered: {sendResult.sentCount}
                  </div>
                  {sendResult.failedCount > 0 && (
                    <div style={{ fontSize: '12px', color: '#f87171', marginTop: '2px' }}>
                      ✕ Failed: {sendResult.failedCount} (user may have blocked the bot or not started it)
                    </div>
                  )}
                  {sendResult.errors && sendResult.errors.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '6px' }}>
                      Top reason: {sendResult.errors[0]?.reason}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: User Quick List */}
            <div className="tg-users-sidebar glass">
              <div className="sidebar-title">
                <Users size={18} className="text-primary" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'white' }}>
                  Telegram Users ({tgUsers.length})
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 12px' }}>
                Tap any user to write to them directly.
              </p>

              <div className="users-scroll-list">
                {tgUsers.map(u => (
                  <div 
                    key={u.telegram_id} 
                    className="user-item-row"
                    onClick={() => {
                      setSendTarget('single');
                      setSelectedUser(u);
                    }}
                  >
                    <div className="user-avatar-xs">
                      {u.first_name?.charAt(0) || 'U'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="user-item-name">{u.first_name} {u.last_name || ''}</div>
                      <div className="user-item-sub">
                        {u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}
                      </div>
                    </div>
                    {u.username && (
                      <a 
                        href={`https://t.me/${u.username}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="tg-icon-link"
                        onClick={(e) => e.stopPropagation()}
                        title="Open in Telegram app"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Message"
        message={`Are you sure you want to permanently delete the message from ${deleteModal.message?.name}?`}
        confirmText={isDeleting ? "Deleting..." : "Delete Message"}
        variant="danger"
        showCancel={true}
        onClose={() => setDeleteModal({ isOpen: false, message: null })}
        onConfirm={handleDelete}
      />

      <style jsx>{`
        .tab-switcher {
          display: flex;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 9px;
          border: none;
          font-size: 13px;
          font-weight: 700;
          color: #a1a1aa;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: #0284c7;
          color: #ffffff;
        }

        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Telegram Panel */
        .tg-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
        }
        @media (max-width: 900px) {
          .tg-layout {
            grid-template-columns: 1fr;
          }
        }

        .tg-composer {
          padding: 24px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .panel-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: 12px;
          font-weight: 700;
          color: #e4e4e7;
        }
        .input-field, .textarea-field {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 10px 14px;
          color: #ffffff;
          font-size: 13px;
          outline: none;
        }
        .input-field:focus, .textarea-field:focus {
          border-color: #38bdf8;
        }
        .field-hint {
          font-size: 11px;
          color: #71717a;
        }

        .target-toggle {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .target-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #a1a1aa;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .target-btn.active {
          background: rgba(56, 189, 248, 0.15);
          border-color: #38bdf8;
          color: #38bdf8;
        }

        .selected-user-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.25);
        }
        .user-avatar-sm {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 13px;
          color: white;
        }
        .btn-clear-user {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .user-dropdown {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .input-field-sm {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 8px 12px;
          color: white;
          font-size: 12px;
          outline: none;
        }
        .user-results-list {
          max-height: 140px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 8px;
          padding: 4px;
        }
        .user-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }
        .user-option:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .user-opt-name {
          color: white;
          font-weight: 700;
        }
        .user-opt-meta {
          color: #71717a;
          font-size: 11px;
        }

        .template-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .template-chip {
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #d4d4d8;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .template-chip:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .btn-send-tg {
          padding: 12px 24px;
          border-radius: 12px;
          background: #0284c7;
          border: none;
          color: white;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .btn-send-tg:hover:not(:disabled) {
          background: #0369a1;
        }
        .btn-send-tg:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .send-result-card {
          padding: 14px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        /* Sidebar users list */
        .tg-users-sidebar {
          padding: 20px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          height: 600px;
        }
        .sidebar-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .users-scroll-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .user-item-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .user-item-row:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .user-avatar-xs {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: white;
        }
        .user-item-name {
          font-size: 12px;
          font-weight: 700;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-item-sub {
          font-size: 10px;
          color: #71717a;
        }
        .tg-icon-link {
          color: #38bdf8;
          padding: 4px;
        }
        .text-primary { color: #38bdf8; }
      `}</style>
    </div>
  );
}
