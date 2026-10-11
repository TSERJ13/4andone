"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/utils/supabase';
import { adminDb } from '@/lib/admin-db';
import { 
  Mail, MessageSquare, Trash2, Reply, RefreshCw, 
  Search, Calendar, User, Clock, CheckCircle2, AlertTriangle, 
  Filter, Send, Users, Sparkles, ExternalLink, ShieldCheck, 
  Bot, AlertCircle, Plus, Eye, EyeOff, Bold, Italic, Link2, Code, 
  BellRing, Award 
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
  premium_until?: string | null;
}

interface InlineBtn {
  text: string;
  url: string;
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

  // TELEGRAM STATE
  const [tgUsers, setTgUsers] = useState<TelegramUser[]>([]);
  const [loadingTgUsers, setLoadingTgUsers] = useState(false);
  const [sendTarget, setSendTarget] = useState<'broadcast' | 'single' | 'expiring'>('broadcast');
  const [selectedUser, setSelectedUser] = useState<TelegramUser | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [tgMessageText, setTgMessageText] = useState('');
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [buttons, setButtons] = useState<InlineBtn[]>([
    { text: '🎵 Open 4and.one Player', url: 'https://4and.one' }
  ]);
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
        .select('telegram_id, first_name, last_name, username, is_premium, premium_until')
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

  // Compute users whose Premium expires in the next 5 days
  const expiringUsers = useMemo(() => {
    const now = Date.now();
    const fiveDaysMs = 5 * 86400000;
    return tgUsers.filter(u => {
      if (!u.is_premium || !u.premium_until) return false;
      const until = new Date(u.premium_until).getTime();
      return until > now && (until - now) <= fiveDaysMs;
    });
  }, [tgUsers]);

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
        target: sendTarget === 'expiring' ? 'selected' : sendTarget,
        botToken: botToken.trim() || undefined,
        buttons: buttons.filter(b => b.text.trim() && b.url.trim()),
      };

      if (sendTarget === 'single' && selectedUser) {
        payload.telegramId = selectedUser.telegram_id;
      } else if (sendTarget === 'expiring') {
        payload.telegramIds = expiringUsers.map(u => u.telegram_id);
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

  // Button management
  const addButton = () => {
    setButtons(prev => [...prev, { text: 'New Button', url: 'https://4and.one' }]);
  };

  const updateButton = (index: number, field: 'text' | 'url', val: string) => {
    setButtons(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const removeButton = (index: number) => {
    setButtons(prev => prev.filter((_, i) => i !== index));
  };

  // Formatting helpers
  const insertFormat = (tag: 'b' | 'i' | 'a' | 'code' | 'emoji', extra?: string) => {
    if (tag === 'b') {
      setTgMessageText(prev => prev + ' <b>bold text</b> ');
    } else if (tag === 'i') {
      setTgMessageText(prev => prev + ' <i>italic text</i> ');
    } else if (tag === 'code') {
      setTgMessageText(prev => prev + ' <code>code</code> ');
    } else if (tag === 'a') {
      setTgMessageText(prev => prev + ' <a href="https://4and.one">link text</a> ');
    } else if (tag === 'emoji' && extra) {
      setTgMessageText(prev => prev + extra);
    }
  };

  const applyTemplate = (type: 'update' | 'gift' | 'referral' | 'expiring') => {
    if (type === 'update') {
      setTgMessageText("🎵 <b>New Tracks Added!</b>\n\nFresh dancesport music has just been uploaded to 4and.one with native BPM tempo control. Check out the latest Ballroom & Latin releases today!");
      setButtons([{ text: '🎵 Open Music Player', url: 'https://4and.one' }]);
    } else if (type === 'gift') {
      setTgMessageText("⭐ <b>Special Gift from 4and.one!</b>\n\nThank you for dancing with us. We've granted you a special bonus session! Enjoy ad-free listening and competition practice.");
      setButtons([{ text: '⭐ Start Listening', url: 'https://4and.one' }]);
    } else if (type === 'referral') {
      setTgMessageText("🎁 <b>Invite a Friend, Both Get 1 Month Free!</b>\n\nInvite your dance partner to 4and.one. When they sign in, you both receive 1 month of free Premium immediately!");
      setButtons([{ text: '🎁 Get Invite Link', url: 'https://4and.one/earn' }]);
    } else if (type === 'expiring') {
      setTgMessageText("⏳ <b>Your 4and.one Premium expires soon!</b>\n\nYour Premium subscription will end in 5 days. Renew now to keep uninterrupted ad-free playback, offline downloads, and competition Final Mode practice!");
      setButtons([{ text: '💎 Renew Premium Now', url: 'https://4and.one/earn' }]);
    }
  };

  const loadExpiringReminder = () => {
    setSendTarget('expiring');
    applyTemplate('expiring');
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
            Manage user inquiries and compose rich Telegram messages with live preview &amp; action buttons.
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

      {/* TAB 2: ADVANCED TELEGRAM BOT MESSAGING */}
      {activeTab === 'telegram' && (
        <div className="telegram-panel">
          {/* Quick Notice for Expiring Users */}
          <div className="expiring-alert-banner glass">
            <div className="alert-left">
              <div className="alert-icon-box">
                <BellRing size={20} className="text-amber" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'white' }}>
                  Expiring Subscriptions Reminder (Next 5 Days)
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#a1a1aa' }}>
                  {expiringUsers.length > 0
                    ? `Found ${expiringUsers.length} user(s) whose Premium expires within the next 5 days.`
                    : 'No users expiring in the next 5 days.'}
                </p>
              </div>
            </div>
            {expiringUsers.length > 0 && (
              <button
                type="button"
                className="btn-notify-expiring"
                onClick={loadExpiringReminder}
              >
                <span>Notify All {expiringUsers.length} Expiring Users ➔</span>
              </button>
            )}
          </div>

          <div className="tg-layout">
            {/* Left Column: Composer with formatting & buttons */}
            <div className="tg-composer glass">
              <div className="panel-title-row">
                <Bot size={22} className="text-primary" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'white', margin: 0 }}>
                    Compose Telegram Post
                  </h3>
                  <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '2px 0 0' }}>
                    Sent via Telegram Bot with formatting &amp; clickable link buttons.
                  </p>
                </div>
              </div>

              {/* Bot Token Configuration */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="field-label" style={{ margin: 0 }}>Telegram Bot Token (from @BotFather)</label>
                  {botToken && (
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> დამახსოვრებულია ბრაუზერში
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={botToken}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBotToken(val);
                      if (typeof window !== 'undefined') {
                        if (val.trim()) {
                          localStorage.setItem('4andone_admin_bot_token', val.trim());
                        } else {
                          localStorage.removeItem('4andone_admin_bot_token');
                        }
                      }
                    }}
                    placeholder="Paste your 123456789:ABCdefGhI... bot token"
                    className="input-field"
                    style={{ paddingRight: '42px', fontFamily: showToken ? 'monospace' : 'inherit' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#a1a1aa',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="field-hint" style={{ color: botToken ? '#34d399' : '#a1a1aa' }}>
                  {botToken 
                    ? '✓ ტოკენი შენახულია — გვერდიც რომ გადატვირთოთ ან ხვალ გახსნათ, აღარ წაიშლება.' 
                    : 'ჩასვით თქვენი ბოტის ტოკენი ერთხელ; ის ავტომატურად შეინახება თქვენს ბრაუზერში.'}
                </span>
              </div>

              {/* Target Selector */}
              <div className="form-group">
                <label className="field-label">Audience:</label>
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
                    <span>Broadcast ({tgUsers.length} Users)</span>
                  </button>
                  <button
                    type="button"
                    className={`target-btn ${sendTarget === 'single' ? 'active' : ''}`}
                    onClick={() => setSendTarget('single')}
                  >
                    <User size={15} />
                    <span>Specific User {selectedUser ? `(${selectedUser.first_name})` : ''}</span>
                  </button>
                  <button
                    type="button"
                    className={`target-btn ${sendTarget === 'expiring' ? 'active' : ''}`}
                    onClick={() => {
                      setSendTarget('expiring');
                      setSelectedUser(null);
                      applyTemplate('expiring');
                    }}
                  >
                    <BellRing size={15} />
                    <span>Expiring Soon ({expiringUsers.length})</span>
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
                    onClick={() => applyTemplate('update')}
                  >
                    🎵 New Music Update
                  </button>
                  <button
                    type="button"
                    className="template-chip"
                    onClick={() => applyTemplate('gift')}
                  >
                    ⭐ Practice Gift
                  </button>
                  <button
                    type="button"
                    className="template-chip"
                    onClick={() => applyTemplate('referral')}
                  >
                    🎁 Referral Reminder
                  </button>
                  <button
                    type="button"
                    className="template-chip"
                    onClick={() => applyTemplate('expiring')}
                  >
                    ⏳ Expiry (5 Days)
                  </button>
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="form-group">
                <div className="format-toolbar-row">
                  <label className="field-label">Message Body:</label>
                  <div className="format-tools">
                    <button type="button" className="tool-btn" onClick={() => insertFormat('b')} title="Bold">
                      <Bold size={13} />
                    </button>
                    <button type="button" className="tool-btn" onClick={() => insertFormat('i')} title="Italic">
                      <Italic size={13} />
                    </button>
                    <button type="button" className="tool-btn" onClick={() => insertFormat('a')} title="Link">
                      <Link2 size={13} />
                    </button>
                    <button type="button" className="tool-btn" onClick={() => insertFormat('code')} title="Monospace">
                      <Code size={13} />
                    </button>
                    <div className="tool-divider" />
                    <button type="button" className="emoji-btn" onClick={() => insertFormat('emoji', '🎵')}>🎵</button>
                    <button type="button" className="emoji-btn" onClick={() => insertFormat('emoji', '⭐')}>⭐</button>
                    <button type="button" className="emoji-btn" onClick={() => insertFormat('emoji', '🏆')}>🏆</button>
                    <button type="button" className="emoji-btn" onClick={() => insertFormat('emoji', '🎁')}>🎁</button>
                    <button type="button" className="emoji-btn" onClick={() => insertFormat('emoji', '⏳')}>⏳</button>
                  </div>
                </div>

                <textarea
                  value={tgMessageText}
                  onChange={(e) => setTgMessageText(e.target.value)}
                  rows={6}
                  placeholder="Type your message here using HTML formatting..."
                  className="textarea-field"
                />
              </div>

              {/* Telegram Inline Buttons Section */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="field-label">Action Buttons (Inline Keyboard):</label>
                  <button type="button" className="btn-add-btn" onClick={addButton}>
                    <Plus size={13} />
                    <span>Add Button</span>
                  </button>
                </div>

                {buttons.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#71717a', margin: '4px 0' }}>
                    No buttons added yet. Click &quot;Add Button&quot; to attach link buttons below the message.
                  </p>
                ) : (
                  <div className="buttons-editor-list">
                    {buttons.map((b, i) => (
                      <div key={i} className="btn-edit-row">
                        <input
                          type="text"
                          value={b.text}
                          onChange={(e) => updateButton(i, 'text', e.target.value)}
                          placeholder="Button Label (e.g. Open Player)"
                          className="input-btn-text"
                        />
                        <input
                          type="text"
                          value={b.url}
                          onChange={(e) => updateButton(i, 'url', e.target.value)}
                          placeholder="https://..."
                          className="input-btn-url"
                        />
                        <button
                          type="button"
                          className="btn-del-btn"
                          onClick={() => removeButton(i)}
                          title="Remove button"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                        : sendTarget === 'expiring'
                        ? `Send to ${expiringUsers.length} Expiring Users`
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

            {/* Right Column: Live Telegram Post Preview & Quick List */}
            <div className="tg-sidebar-column">
              {/* LIVE TELEGRAM PREVIEW BOX */}
              <div className="tg-preview-card glass">
                <div className="preview-header">
                  <Eye size={15} className="text-primary" />
                  <span className="preview-label">Live Telegram Preview</span>
                </div>

                <div className="telegram-chat-simulation">
                  {/* Message Bubble */}
                  <div className="tg-bubble">
                    <div className="tg-bot-header">
                      <span className="tg-bot-name">4and.one Music Bot</span>
                      <span className="tg-bot-badge">bot</span>
                    </div>

                    <div 
                      className="tg-bubble-body"
                      dangerouslySetInnerHTML={{ 
                        __html: tgMessageText.trim() 
                          ? tgMessageText.replace(/\n/g, '<br/>') 
                          : '<i>Type your message to see a live preview here...</i>' 
                      }} 
                    />

                    <div className="tg-bubble-time">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Inline Buttons Preview */}
                  {buttons.filter(b => b.text.trim()).length > 0 && (
                    <div className="tg-inline-buttons-wrap">
                      {buttons.filter(b => b.text.trim()).map((b, i) => (
                        <a
                          key={i}
                          href={b.url}
                          target="_blank"
                          rel="noreferrer"
                          className="tg-sim-btn"
                          onClick={(e) => e.preventDefault()}
                        >
                          <span>{b.text}</span>
                          <ExternalLink size={11} opacity={0.6} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* USER QUICK PICKER LIST */}
              <div className="tg-users-sidebar glass">
                <div className="sidebar-title">
                  <Users size={16} className="text-primary" />
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'white' }}>
                    Quick Message User ({tgUsers.length})
                  </h4>
                </div>
                <p style={{ fontSize: '11px', color: '#71717a', margin: '2px 0 10px' }}>
                  Click to select as recipient.
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
                      {u.is_premium && (
                        <span className="premium-mini-badge" title="Active Premium">⭐</span>
                      )}
                    </div>
                  ))}
                </div>
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

        /* Expiring Alert Banner */
        .expiring-alert-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-radius: 16px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.25);
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .alert-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .alert-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-notify-expiring {
          padding: 8px 16px;
          border-radius: 10px;
          background: #f59e0b;
          border: none;
          color: #000000;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-notify-expiring:hover {
          background: #d97706;
        }

        /* Telegram Layout */
        .tg-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
        }
        @media (max-width: 950px) {
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
          white-space: nowrap;
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

        /* Formatting tools */
        .format-toolbar-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .format-tools {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 0, 0, 0.3);
          padding: 3px 6px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .tool-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: #a1a1aa;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tool-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .tool-divider {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 4px;
        }
        .emoji-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: transparent;
          border: none;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .emoji-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* Action Buttons Editor */
        .btn-add-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #38bdf8;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .buttons-editor-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .btn-edit-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .input-btn-text {
          flex: 1;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 8px 10px;
          color: white;
          font-size: 12px;
          outline: none;
        }
        .input-btn-url {
          flex: 1.2;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 8px 10px;
          color: white;
          font-size: 12px;
          outline: none;
        }
        .btn-del-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          cursor: pointer;
          font-size: 12px;
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

        /* Right Column */
        .tg-sidebar-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Live Telegram Preview */
        .tg-preview-card {
          padding: 16px;
          border-radius: 18px;
          background: #0e1621;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .preview-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
        }
        .preview-label {
          font-size: 11px;
          font-weight: 800;
          color: #38bdf8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .telegram-chat-simulation {
          background: #182533;
          border-radius: 14px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tg-bubble {
          background: #2b5278;
          border-radius: 12px 12px 12px 4px;
          padding: 10px 12px;
          color: #ffffff;
          position: relative;
        }
        .tg-bot-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }
        .tg-bot-name {
          font-size: 12px;
          font-weight: 800;
          color: #64b5f6;
        }
        .tg-bot-badge {
          font-size: 9px;
          background: rgba(0, 0, 0, 0.2);
          padding: 1px 4px;
          border-radius: 3px;
          color: #bbdefb;
          text-transform: uppercase;
        }
        .tg-bubble-body {
          font-size: 13px;
          line-height: 1.45;
          word-break: break-word;
          color: #e3f2fd;
        }
        .tg-bubble-time {
          font-size: 10px;
          color: #90caf9;
          text-align: right;
          margin-top: 4px;
        }
        .tg-inline-buttons-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tg-sim-btn {
          background: #233446;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px 12px;
          color: #64b5f6;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-decoration: none;
        }

        /* Sidebar users list */
        .tg-users-sidebar {
          padding: 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          height: 380px;
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
          padding: 6px 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .user-item-row:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .user-avatar-xs {
          width: 26px;
          height: 26px;
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
        .premium-mini-badge {
          font-size: 11px;
        }

        .text-primary { color: #38bdf8; }
        .text-amber { color: #f59e0b; }
      `}</style>
    </div>
  );
}
