"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { adminDb } from '@/lib/admin-db';
import { 
  Mail, MessageSquare, Trash2, Reply, RefreshCw, 
  Search, Calendar, User, Clock, CheckCircle2, AlertTriangle, 
  Filter, Send, Users, Sparkles, ExternalLink, ShieldCheck, 
  Bot, AlertCircle, Plus, Eye, EyeOff, Bold, Italic, Link2, Code, 
  BellRing, Award, CheckSquare, Square, Megaphone, Crown, UserCheck, UserX,
  Smile, X, Image as ImageIcon
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

const EMOJI_SETS: { id: 'dance' | 'faces' | 'gestures' | 'objects' | 'symbols'; label: string; emojis: string[] }[] = [
  {
    id: 'dance',
    label: '🎵 Music & Dance',
    emojis: ['🎵', '🎶', '💃', '🕺', '🎧', '📻', '🎷', '🎺', '🎹', '🥁', '🎸', '🎻', '🎤', '✨', '🔥', '⭐', '🏆', '🥇', '🥈', '🥉']
  },
  {
    id: 'faces',
    label: '😊 Faces & Mood',
    emojis: ['😀', '😃', '😄', '😁', '🤩', '😎', '😍', '🥳', '🙌', '👏', '🤝', '💪', '🚀', '💖', '❤️', '🧡', '💛', '💚', '💙', '💜']
  },
  {
    id: 'gestures',
    label: '👉 Actions & Notice',
    emojis: ['👉', '👈', '👆', '👇', '📢', '📣', '🔔', '⏳', '⏰', '⚡', '💡', '📌', '📍', '🎯', '✅', '❌', '⚠️', '🚨', '👀', '🎉']
  },
  {
    id: 'objects',
    label: '🎁 Promo & Gifts',
    emojis: ['🎁', '💎', '👑', '🎟️', '🏷️', '💰', '💳', '💵', '📦', '💌', '📩', '📨', '✉️', '📱', '💻', '🌐', '🔗', '🔒', '🔑', '🏷️']
  },
  {
    id: 'symbols',
    label: '🌟 Stars & Badges',
    emojis: ['⭐', '🌟', '💫', '✨', '💥', '💯', '🔥', '⚡', '🌈', '🍀', '💎', '🏅', '🎖️', '🎗️', '🔮', '🧿', '🪄', '☀️', '🌙', '🪐']
  }
];

export default function AdminMessagesPage() {
  const [activeTab, setActiveTab] = useState<'incoming' | 'telegram'>('telegram');
  
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
  const [sendTarget, setSendTarget] = useState<'broadcast' | 'free' | 'premium' | 'expiring' | 'selected' | 'channel'>('broadcast');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [channelUsername, setChannelUsername] = useState('@fourandonemusic');
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [tgMessageText, setTgMessageText] = useState('');
  const [tgPhotoUrl, setTgPhotoUrl] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [tokenSavedFlash, setTokenSavedFlash] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTab, setEmojiTab] = useState<'dance' | 'faces' | 'gestures' | 'objects' | 'symbols'>('dance');
  const [buttons, setButtons] = useState<InlineBtn[]>([
    { text: '🎵 Open 4and.one Player', url: 'https://4and.one' }
  ]);
  const [isSendingTg, setIsSendingTg] = useState(false);
  const [sendResult, setSendResult] = useState<{
    total: number;
    sentCount: number;
    failedCount: number;
    errors?: { id: number | string; reason: string }[];
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
    if (savedToken) {
      setBotToken(savedToken);
      setIsEditingToken(false);
    } else {
      setIsEditingToken(true);
    }
  }, [fetchMessages, fetchTgUsers]);

  // User segments
  const freeUsers = useMemo(() => tgUsers.filter(u => !u.is_premium), [tgUsers]);
  const premiumUsers = useMemo(() => tgUsers.filter(u => !!u.is_premium), [tgUsers]);
  // Compute users whose Premium expires in the next 5 days
  // (EXCLUDES permanent/lifetime premium users who have unlimited access or no expiry)
  const expiringUsers = useMemo(() => {
    const now = Date.now();
    const fiveDaysMs = 5 * 86400000;
    return tgUsers.filter(u => {
      // Must have active premium
      if (!u.is_premium) return false;
      // If no expiration date (null/undefined), it is permanent/lifetime! DO NOT SEND!
      if (!u.premium_until) return false;

      const untilDate = new Date(u.premium_until);
      const until = untilDate.getTime();
      if (isNaN(until)) return false;

      // Permanent / Lifetime check: if set to 2030+ or more than a year away, DO NOT SEND!
      if (untilDate.getFullYear() > 2030 || (until - now) > 365 * 86400000) return false;

      // Only true if expiry is actually in the future AND within <= 5 days!
      return until > now && (until - now) <= fiveDaysMs;
    });
  }, [tgUsers]);

  const filteredSidebarUsers = useMemo(() => {
    let list = tgUsers;
    if (sidebarFilter === 'free') list = freeUsers;
    else if (sidebarFilter === 'premium') list = premiumUsers;

    if (!sidebarSearch.trim()) return list;
    const q = sidebarSearch.toLowerCase();
    return list.filter(u => 
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      String(u.telegram_id).includes(q)
    );
  }, [tgUsers, freeUsers, premiumUsers, sidebarFilter, sidebarSearch]);

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => {
      const exists = prev.includes(userId);
      const next = exists ? prev.filter(id => id !== userId) : [...prev, userId];
      if (next.length > 0) setSendTarget('selected');
      return next;
    });
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredSidebarUsers.map(u => u.telegram_id);
    setSelectedUserIds(prev => {
      const combined = Array.from(new Set([...prev, ...filteredIds]));
      if (combined.length > 0) setSendTarget('selected');
      return combined;
    });
  };

  const deselectAll = () => {
    setSelectedUserIds([]);
    if (sendTarget === 'selected') setSendTarget('broadcast');
  };

  const handleSaveToken = () => {
    if (!botToken.trim()) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('4andone_admin_bot_token', botToken.trim());
      setTokenSavedFlash('✓ ტოკენი წარმატებით შენახულია!');
      setIsEditingToken(false);
      setTimeout(() => setTokenSavedFlash(null), 3000);
    }
  };

  const handleClearToken = () => {
    setBotToken('');
    setIsEditingToken(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('4andone_admin_bot_token');
      setTokenSavedFlash('🗑️ ტოკენი წაიშალა!');
      setTimeout(() => setTokenSavedFlash(null), 3000);
    }
  };

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
    if (sendTarget === 'selected' && selectedUserIds.length === 0) {
      alert('გთხოვთ მონიშნოთ მინიმუმ 1 მომხმარებელი სიიდან (Please select at least 1 user).');
      return;
    }

    setIsSendingTg(true);
    setSendResult(null);

    try {
      const payload: Record<string, any> = {
        message: tgMessageText.trim(),
        target: sendTarget,
        photoUrl: tgPhotoUrl.trim() || undefined,
        botToken: botToken.trim() || undefined,
        buttons: buttons.filter(b => b.text.trim() && b.url.trim()),
      };

      if (sendTarget === 'selected') {
        payload.telegramIds = selectedUserIds;
      } else if (sendTarget === 'expiring') {
        payload.target = 'selected';
        payload.telegramIds = expiringUsers.map(u => u.telegram_id);
      } else if (sendTarget === 'channel') {
        payload.channel = channelUsername.trim() || '@fourandonemusic';
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

  // Cursor-aware text insertion helper
  const insertTextAtCursor = (textToInsert: string) => {
    const el = textareaRef.current;
    if (!el) {
      setTgMessageText(prev => prev + textToInsert);
      return;
    }

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const val = el.value;

    const nextVal = val.slice(0, start) + textToInsert + val.slice(end);
    setTgMessageText(nextVal);

    // Restore focus and cursor position right after inserted text
    setTimeout(() => {
      el.focus();
      const newPos = start + textToInsert.length;
      el.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Formatting helpers
  const insertFormat = (tag: 'b' | 'i' | 'a' | 'code' | 'emoji', extra?: string) => {
    if (tag === 'b') {
      insertTextAtCursor('<b>bold text</b>');
    } else if (tag === 'i') {
      insertTextAtCursor('<i>italic text</i>');
    } else if (tag === 'code') {
      insertTextAtCursor('<code>code</code>');
    } else if (tag === 'a') {
      insertTextAtCursor('<a href="https://4and.one">link text</a>');
    } else if (tag === 'emoji' && extra) {
      insertTextAtCursor(extra);
    }
  };

  const applyTemplate = (type: 'update' | 'gift' | 'referral' | 'expiring' | 'channel') => {
    let newText = '';
    let newBtn: InlineBtn = { text: '🎵 Open 4and.one Player', url: 'https://4and.one' };

    if (type === 'update') {
      newText = "🎵 <b>New Tracks Added!</b>\n\nFresh dancesport music has just been uploaded to 4and.one with native BPM tempo control. Check out the latest Ballroom & Latin releases today!";
      newBtn = { text: '🎵 Open Music Player', url: 'https://4and.one' };
    } else if (type === 'gift') {
      newText = "⭐ <b>Special Gift from 4and.one!</b>\n\nThank you for dancing with us. We've granted you a special bonus session! Enjoy ad-free listening and competition practice.";
      newBtn = { text: '⭐ Start Listening', url: 'https://4and.one' };
    } else if (type === 'referral') {
      newText = "🎁 <b>Invite a Friend, Both Get 1 Month Free!</b>\n\nInvite your dance partner to 4and.one. When they sign in, you both receive 1 month of free Premium immediately!";
      newBtn = { text: '🎁 Get Invite Link', url: 'https://4and.one/earn' };
    } else if (type === 'expiring') {
      newText = "⏳ <b>Your 4and.one Premium expires soon!</b>\n\nYour Premium subscription will end in 5 days. Renew now to keep uninterrupted ad-free playback, offline downloads, and competition Final Mode practice!";
      newBtn = { text: '💎 Renew Premium Now', url: 'https://4and.one/earn' };
    } else if (type === 'channel') {
      newText = "📢 <b>Join our official Telegram Channel!</b>\n\nHey {first_name}! 🎵 Follow @fourandonemusic to get the freshest ballroom & latin track releases, competition playlists, and exclusive dance gifts first!";
      newBtn = { text: '📢 Join @fourandonemusic', url: 'https://t.me/fourandonemusic' };
    }

    // Append text if already typing, otherwise set directly
    setTgMessageText(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return newText;
      return `${trimmed}\n\n${newText}`;
    });

    // Add button if it doesn't already exist
    setButtons(prev => {
      if (prev.some(b => b.text === newBtn.text || b.url === newBtn.url)) return prev;
      return [...prev, newBtn];
    });
  };

  const loadExpiringReminder = () => {
    setSendTarget('expiring');
    applyTemplate('expiring');
  };



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
            className={`tab-btn ${activeTab === 'telegram' ? 'active' : ''}`}
            onClick={() => setActiveTab('telegram')}
          >
            <Send size={16} />
            <span>Send Telegram ({tgUsers.length} Users)</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('incoming')}
          >
            <Mail size={16} />
            <span>Inquiries ({messages.length})</span>
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
              {botToken && !isEditingToken ? (
                <div className="token-saved-compact-bar glass">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div className="token-online-dot" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#34d399' }}>
                          ✓ Telegram Bot Connected
                        </span>
                        <span style={{ fontSize: '11px', color: '#71717a', fontFamily: 'monospace' }}>
                          ({botToken.slice(0, 6)}...{botToken.slice(-4)})
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                        ტოკენი დამახსოვრებულია და მზადაა გაგზავნისთვის
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingToken(true)}
                      className="btn-token-mini-action"
                    >
                      შეცვლა / Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleClearToken}
                      className="btn-token-mini-action text-danger"
                      title="ტოკენის წაშლა"
                    >
                      <Trash2 size={12} />
                      წაშლა
                    </button>
                  </div>
                </div>
              ) : (
                <div className="form-group animate-in">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="field-label" style={{ margin: 0 }}>Telegram Bot Token (from @BotFather)</label>
                    {botToken && (
                      <button
                        type="button"
                        onClick={() => setIsEditingToken(false)}
                        className="btn-collapse-token"
                      >
                        დამალვა ✕
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        placeholder="Paste your 123456789:ABCdefGhI... bot token"
                        className="input-field"
                        style={{ width: '100%', paddingRight: '42px', fontFamily: showToken ? 'monospace' : 'inherit' }}
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

                    <button
                      type="button"
                      onClick={handleSaveToken}
                      disabled={!botToken.trim()}
                      className="btn-token-save"
                      title="შენახვა და დამალვა"
                    >
                      <CheckCircle2 size={14} />
                      <span>შენახვა</span>
                    </button>

                    {botToken && (
                      <button
                        type="button"
                        onClick={handleClearToken}
                        className="btn-token-delete"
                        title="ტოკენის წაშლა"
                      >
                        <Trash2 size={14} />
                        <span>წაშლა</span>
                      </button>
                    )}
                  </div>

                  <span className="field-hint" style={{ color: '#a1a1aa' }}>
                    ჩასვით ტოკენი და დააჭირეთ „შენახვას“ — ის შეინახება და კომპაქტურად დაიმალება.
                  </span>
                </div>
              )}

              {/* Target Selector */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="field-label" style={{ margin: 0 }}>სამიზნე აუდიტორია (Audience):</label>
                  <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                    აირჩიეთ ვის გაეგზავნოს შეტყობინება
                  </span>
                </div>
                <div className="target-toggle">
                  <button
                    type="button"
                    className={`target-btn ${sendTarget === 'broadcast' ? 'active' : ''}`}
                    onClick={() => setSendTarget('broadcast')}
                    title="ყველა მომხმარებელი"
                  >
                    <Users size={15} />
                    <span>Broadcast ({tgUsers.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`target-btn ${sendTarget === 'free' ? 'active' : ''}`}
                    onClick={() => setSendTarget('free')}
                    title="მხოლოდ უფასო იუზერები (გამოწერის გარეშე)"
                  >
                    <UserX size={15} />
                    <span>Free Only ({freeUsers.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`target-btn ${sendTarget === 'premium' ? 'active' : ''}`}
                    onClick={() => setSendTarget('premium')}
                    title="მხოლოდ პრემიუმ იუზერები (აქტიური გამოწერით)"
                  >
                    <Crown size={15} />
                    <span>Premium Only ({premiumUsers.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`target-btn ${sendTarget === 'expiring' ? 'active' : ''}`}
                    onClick={() => {
                      setSendTarget('expiring');
                      applyTemplate('expiring');
                    }}
                    title="ვისაც 5 დღეში ეწურება გამოწერა"
                  >
                    <BellRing size={15} />
                    <span>Expiring Soon ({expiringUsers.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`target-btn ${sendTarget === 'selected' ? 'active' : ''}`}
                    onClick={() => setSendTarget('selected')}
                    title="მონიშნული იუზერები მარჯვენა სიიდან"
                  >
                    <CheckSquare size={15} />
                    <span>Selected ({selectedUserIds.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`target-btn ${sendTarget === 'channel' ? 'active' : ''}`}
                    onClick={() => setSendTarget('channel')}
                    title="პირდაპირ Telegram არხზე დაპოსტვა"
                  >
                    <Megaphone size={15} />
                    <span>Channel (@fourandonemusic)</span>
                  </button>
                </div>

                {/* Audience Info Banner */}
                <div className="audience-info-banner">
                  {sendTarget === 'broadcast' && (
                    <div className="info-banner-inner" style={{ borderColor: 'rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.08)' }}>
                      <Users size={16} color="#38bdf8" />
                      <span>მესიჯი გაეგზავნება ბაზაში არსებულ ყველა <b>{tgUsers.length}</b> მომხმარებელს.</span>
                    </div>
                  )}
                  {sendTarget === 'free' && (
                    <div className="info-banner-inner" style={{ borderColor: 'rgba(251, 146, 60, 0.3)', background: 'rgba(251, 146, 60, 0.08)' }}>
                      <UserX size={16} color="#fb923c" />
                      <span>მესიჯი გაეგზავნება მხოლოდ <b>{freeUsers.length}</b> მომხმარებელს <b>გამოწერის გარეშე</b> (იდეალურია აქციებისა და ფასდაკლებისთვის).</span>
                    </div>
                  )}
                  {sendTarget === 'premium' && (
                    <div className="info-banner-inner" style={{ borderColor: 'rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.08)' }}>
                      <Crown size={16} color="#c084fc" />
                      <span>მესიჯი გაეგზავნება მხოლოდ <b>{premiumUsers.length}</b> მომხმარებელს <b>აქტიური პრემიუმით</b> (VIP შეტყობინებები &amp; ექსკლუზივები).</span>
                    </div>
                  )}
                  {sendTarget === 'expiring' && (
                    <div className="info-banner-inner" style={{ borderColor: 'rgba(234, 179, 8, 0.3)', background: 'rgba(234, 179, 8, 0.08)' }}>
                      <BellRing size={16} color="#eab308" />
                      <span>მესიჯი გაეგზავნება <b>{expiringUsers.length}</b> მომხმარებელს, ვისაც ვადა 5 დღეში ეწურება.</span>
                    </div>
                  )}
                  {sendTarget === 'selected' && (
                    <div className="info-banner-inner" style={{ borderColor: 'rgba(34, 197, 94, 0.3)', background: 'rgba(34, 197, 94, 0.08)', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckSquare size={16} color="#22c55e" />
                        <span>მონიშნულია <b>{selectedUserIds.length}</b> მომხმარებელი მარჯვენა სიიდან.</span>
                      </div>
                      {selectedUserIds.length > 0 && (
                        <button type="button" onClick={deselectAll} className="btn-banner-clear">
                          მოხსნა ({selectedUserIds.length})
                        </button>
                      )}
                    </div>
                  )}
                  {sendTarget === 'channel' && (
                    <div className="info-banner-channel">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <Megaphone size={18} color="#38bdf8" />
                        <span style={{ fontWeight: 800, color: 'white', fontSize: '13px' }}>
                          Telegram არხი:
                        </span>
                        <input
                          type="text"
                          value={channelUsername}
                          onChange={(e) => setChannelUsername(e.target.value)}
                          placeholder="@fourandonemusic"
                          className="channel-username-input"
                        />
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                        📢 <b>შენიშვნა:</b> შეტყობინება პირდაპირ გამოქვეყნდება <b>{channelUsername}</b> არხზე! იმისთვის, რომ ბოტმა შეძლოს არხში დაპოსტვა, ბოტი ტელეგრამში დამატებული უნდა გყავდეთ ამ არხის ადმინისტრატორად (Admin with &quot;Post Messages&quot; ნებართვით).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Message Templates */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="field-label" style={{ margin: 0 }}>Quick Templates (შაბლონის ჩამატება):</label>
                  {tgMessageText.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setTgMessageText('');
                        setButtons([]);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f87171',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="ტექსტის გასუფთავება"
                    >
                      <Trash2 size={12} />
                      გასუფთავება
                    </button>
                  )}
                </div>
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
                  <button
                    type="button"
                    className="template-chip"
                    onClick={() => applyTemplate('channel')}
                    style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                  >
                    📢 Channel Invite (@fourandonemusic)
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
                    <button 
                      type="button" 
                      className={`tool-btn ${showPhotoInput || tgPhotoUrl ? 'active' : ''}`} 
                      onClick={() => setShowPhotoInput(!showPhotoInput)} 
                      title="ფოტოს ჩასმა (URL-ით, სერვერის დაუტვირთავად)"
                      style={{ color: tgPhotoUrl ? '#38bdf8' : undefined }}
                    >
                      <ImageIcon size={14} />
                    </button>
                    <div className="tool-divider" />
                    <button
                      type="button"
                      className={`tool-btn emoji-picker-toggle-btn ${showEmojiPicker ? 'active' : ''}`}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      title="სხვა ემოჯები (Emoji Picker)"
                    >
                      <Smile size={14} />
                      <span style={{ fontSize: '11px', fontWeight: 700, marginLeft: '3px' }}>Emoji</span>
                    </button>
                    <div className="tool-divider" />
                    <button type="button" className="emoji-btn" onClick={() => insertFormat('emoji', '🎵')} title="🎵">🎵</button>
                    <button type="button" className="emoji-btn" onClick={() => insertFormat('emoji', '🔥')} title="🔥">🔥</button>
                    <button type="button" className="emoji-btn" onClick={() => insertFormat('emoji', '⭐')} title="⭐">⭐</button>
                    <button type="button" className="emoji-btn" onClick={() => insertFormat('emoji', '🎁')} title="🎁">🎁</button>
                  </div>
                </div>

                {/* Rich Emoji Picker Drawer */}
                {showEmojiPicker && (
                  <div className="emoji-picker-container glass animate-in">
                    <div className="emoji-picker-header">
                      <div className="emoji-tabs">
                        {EMOJI_SETS.map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            className={`emoji-tab-btn ${emojiTab === tab.id ? 'active' : ''}`}
                            onClick={() => setEmojiTab(tab.id)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="emoji-picker-close-btn"
                        onClick={() => setShowEmojiPicker(false)}
                        title="დახურვა"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="emoji-grid">
                      {EMOJI_SETS.find(t => t.id === emojiTab)?.emojis.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="emoji-grid-item"
                          onClick={() => {
                            insertFormat('emoji', emoji);
                          }}
                          title={`Insert ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photo URL Input Drawer (Zero Memory, External Direct Link) */}
                {(showPhotoInput || tgPhotoUrl) && (
                  <div className="photo-input-drawer glass animate-in" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: 'rgba(56, 189, 248, 0.06)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '10px',
                    marginBottom: '8px'
                  }}>
                    <ImageIcon size={16} color="#38bdf8" />
                    <input
                      type="url"
                      placeholder="ჩასვით ფოტოს პირდაპირი ლინკი (URL, მაგ: https://images.unsplash.com/... ან https://...)"
                      value={tgPhotoUrl}
                      onChange={(e) => setTgPhotoUrl(e.target.value)}
                      className="input-field-sm"
                      style={{ flex: 1, height: '34px' }}
                    />
                    {tgPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setTgPhotoUrl('');
                          setShowPhotoInput(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        ✕ გასუფთავება
                      </button>
                    )}
                  </div>
                )}

                {/* Personalization variable tags */}
                <div className="personalize-tags-row">
                  <span className="personalize-label">სახელის ჩასმა (Personalize):</span>
                  <button
                    type="button"
                    className="personalize-tag-btn"
                    onClick={() => insertTextAtCursor('{first_name}')}
                    title="მომხმარებლის სახელი (მაგ. Giorgi)"
                  >
                    + &#123;first_name&#125;
                  </button>
                  <button
                    type="button"
                    className="personalize-tag-btn"
                    onClick={() => insertTextAtCursor('{name}')}
                    title="სრული სახელი და გვარი (მაგ. Giorgi Beridze)"
                  >
                    + &#123;name&#125;
                  </button>
                  <button
                    type="button"
                    className="personalize-tag-btn"
                    onClick={() => insertTextAtCursor('{username}')}
                    title="ტელეგრამის @username"
                  >
                    + &#123;username&#125;
                  </button>
                  <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />
                  <button
                    type="button"
                    className="personalize-tag-btn"
                    onClick={() => {
                      insertTextAtCursor('@fourandonemusic');
                      // If channel button isn't already added, add it
                      setButtons(prev => {
                        if (prev.some(b => b.url.includes('fourandonemusic'))) return prev;
                        return [...prev, { text: '📢 Join @fourandonemusic', url: 'https://t.me/fourandonemusic' }];
                      });
                    }}
                    style={{ background: 'rgba(56, 189, 248, 0.18)', borderColor: '#38bdf8', color: '#38bdf8' }}
                    title="არხის მოწვევის ტექსტისა და ღილაკის ჩამატება"
                  >
                    📢 + არხში მოწვევა (@fourandonemusic)
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                  value={tgMessageText}
                  onChange={(e) => setTgMessageText(e.target.value)}
                  rows={6}
                  placeholder="მაგ: გამარჯობა {first_name}! 🎵 გვაქვს ახალი მუსიკა..."
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
                disabled={isSendingTg || !tgMessageText.trim() || (sendTarget === 'selected' && selectedUserIds.length === 0)}
              >
                {isSendingTg ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>შეტყობინება იგზავნება...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>
                      {sendTarget === 'broadcast' 
                        ? `🚀 Broadcast All (${tgUsers.length} Users)` 
                        : sendTarget === 'free'
                        ? `🆓 Send to Free Users (${freeUsers.length} Users)`
                        : sendTarget === 'premium'
                        ? `💎 Send to Premium Users (${premiumUsers.length} Users)`
                        : sendTarget === 'expiring'
                        ? `⏰ Send to Expiring (${expiringUsers.length} Users)`
                        : sendTarget === 'selected'
                        ? `☑️ Send to Selected (${selectedUserIds.length} Users)`
                        : `📢 Post to ${channelUsername || '@fourandonemusic'}`}
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

                    {tgPhotoUrl.trim() && (
                      <div style={{ margin: '6px -12px 10px', maxHeight: '180px', overflow: 'hidden', background: '#000' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={tgPhotoUrl.trim()} 
                          alt="Attached media" 
                          style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      </div>
                    )}

                    <div 
                      className="tg-bubble-body"
                      dangerouslySetInnerHTML={{ 
                        __html: tgMessageText.trim() 
                          ? tgMessageText
                              .replace(/\{first_name\}/gi, '<span style="color: #38bdf8; font-weight: 700;">Alexander</span>')
                              .replace(/\{name\}/gi, '<span style="color: #38bdf8; font-weight: 700;">Alexander Smith</span>')
                              .replace(/\{username\}/gi, '<span style="color: #38bdf8; font-weight: 700;">@alexander</span>')
                              .replace(/\n/g, '<br/>') 
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

              {/* USER MULTI-SELECT & FILTER SIDEBAR */}
              <div className="tg-users-sidebar glass">
                <div className="sidebar-title" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} className="text-primary" />
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'white' }}>
                      Users ({tgUsers.length})
                    </h4>
                  </div>
                  {selectedUserIds.length > 0 && (
                    <span className="selected-counter-tag">
                      {selectedUserIds.length} მონიშნულია
                    </span>
                  )}
                </div>

                {/* Search */}
                <div style={{ margin: '8px 0 6px' }}>
                  <input
                    type="text"
                    placeholder="Search by name, @username, ID..."
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    className="input-field-sm"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Filter Pills */}
                <div className="sidebar-filter-pills">
                  <button
                    type="button"
                    className={`sidebar-pill ${sidebarFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setSidebarFilter('all')}
                  >
                    All ({tgUsers.length})
                  </button>
                  <button
                    type="button"
                    className={`sidebar-pill ${sidebarFilter === 'free' ? 'active' : ''}`}
                    onClick={() => setSidebarFilter('free')}
                  >
                    Free ({freeUsers.length})
                  </button>
                  <button
                    type="button"
                    className={`sidebar-pill ${sidebarFilter === 'premium' ? 'active' : ''}`}
                    onClick={() => setSidebarFilter('premium')}
                  >
                    💎 Pro ({premiumUsers.length})
                  </button>
                </div>

                {/* Batch Actions */}
                <div className="sidebar-actions-row">
                  <button
                    type="button"
                    className="btn-batch-select"
                    onClick={selectAllFiltered}
                    title="ყველა გაფილტრული მომხმარებლის მონიშვნა"
                  >
                    <CheckSquare size={12} /> Select Filtered ({filteredSidebarUsers.length})
                  </button>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      className="btn-batch-deselect"
                      onClick={deselectAll}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Scrollable list */}
                <div className="users-scroll-list">
                  {filteredSidebarUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 8px', color: '#71717a', fontSize: '12px' }}>
                      მომხმარებელი ვერ მოიძებნა
                    </div>
                  ) : (
                    filteredSidebarUsers.map(u => {
                      const isSelected = selectedUserIds.includes(u.telegram_id);
                      return (
                        <div 
                          key={u.telegram_id} 
                          className={`user-item-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleUserSelection(u.telegram_id)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="user-check-icon" style={{ color: isSelected ? '#38bdf8' : '#71717a' }}>
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </div>
                          <div className="user-avatar-xs">
                            {u.first_name?.charAt(0) || 'U'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="user-item-name">{u.first_name} {u.last_name || ''}</div>
                            <div className="user-item-sub">
                              {u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}
                            </div>
                          </div>
                          {u.is_premium ? (
                            <span className="premium-mini-badge" title="Active Premium">💎 PRO</span>
                          ) : (
                            <span className="free-mini-badge">FREE</span>
                          )}
                        </div>
                      );
                    })
                  )}
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

        .btn-token-save {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34d399;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-token-save:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.25);
          border-color: #10b981;
          color: #ffffff;
        }
        .btn-token-save:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-token-delete {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #f87171;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-token-delete:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.25);
          border-color: #ef4444;
          color: #ffffff;
        }
        .btn-token-delete:disabled {
          opacity: 0.4;
          cursor: not-allowed;
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

        .emoji-picker-toggle-btn {
          width: auto !important;
          padding: 0 8px !important;
          gap: 4px;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #e4e4e7 !important;
        }
        .emoji-picker-toggle-btn:hover,
        .emoji-picker-toggle-btn.active {
          background: rgba(56, 189, 248, 0.2) !important;
          border-color: rgba(56, 189, 248, 0.4) !important;
          color: #38bdf8 !important;
        }

        .emoji-picker-container {
          background: rgba(20, 24, 33, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 10px 12px;
          margin-bottom: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .emoji-picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .emoji-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .emoji-tabs::-webkit-scrollbar {
          display: none;
        }
        .emoji-tab-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #a1a1aa;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .emoji-tab-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.08);
        }
        .emoji-tab-btn.active {
          background: rgba(56, 189, 248, 0.15);
          border-color: #38bdf8;
          color: #38bdf8;
        }
        .emoji-picker-close-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: #a1a1aa;
          border-radius: 6px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .emoji-picker-close-btn:hover {
          color: white;
          background: rgba(239, 68, 68, 0.2);
        }
        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
          gap: 4px;
          max-height: 120px;
          overflow-y: auto;
        }
        .emoji-grid-item {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          font-size: 18px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.1s, background-color 0.15s;
        }
        .emoji-grid-item:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.2);
          border-color: rgba(255, 255, 255, 0.15);
        }

        /* Personalize Variable Tags */
        .personalize-tags-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 6px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .personalize-label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          margin-right: 4px;
        }
        .personalize-tag-btn {
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.25);
          color: #38bdf8;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          font-family: monospace;
          transition: all 0.2s;
        }
        .personalize-tag-btn:hover {
          background: rgba(56, 189, 248, 0.25);
          border-color: #38bdf8;
          color: white;
          transform: translateY(-1px);
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

        /* Audience Banner Styles */
        .audience-info-banner {
          margin-top: 8px;
        }
        .info-banner-inner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid;
          font-size: 12px;
          color: #e4e4e7;
        }
        .info-banner-channel {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(56, 189, 248, 0.3);
          background: rgba(56, 189, 248, 0.08);
        }
        .channel-username-input {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(56, 189, 248, 0.4);
          border-radius: 8px;
          padding: 4px 10px;
          color: #38bdf8;
          font-size: 13px;
          font-weight: 700;
          outline: none;
        }
        .btn-banner-clear {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #fca5a5;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-banner-clear:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        /* Sidebar user list & filter styles */
        .tg-users-sidebar {
          padding: 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          height: 440px;
        }
        .selected-counter-tag {
          font-size: 11px;
          font-weight: 800;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.15);
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid rgba(56, 189, 248, 0.3);
        }
        .sidebar-filter-pills {
          display: flex;
          gap: 4px;
          margin-bottom: 8px;
        }
        .sidebar-pill {
          flex: 1;
          padding: 4px 6px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #a1a1aa;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sidebar-pill.active {
          background: rgba(56, 189, 248, 0.15);
          border-color: #38bdf8;
          color: #38bdf8;
        }
        .sidebar-actions-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 8px;
        }
        .btn-batch-select {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.25);
          color: #38bdf8;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-batch-deselect {
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #a1a1aa;
          font-size: 11px;
          cursor: pointer;
        }
        .user-item-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid transparent;
        }
        .user-item-row:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .user-item-row.selected {
          background: rgba(56, 189, 248, 0.12);
          border-color: rgba(56, 189, 248, 0.35);
        }
        .user-check-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .free-mini-badge {
          font-size: 9px;
          font-weight: 800;
          color: #71717a;
          background: rgba(255, 255, 255, 0.06);
          padding: 1px 5px;
          border-radius: 4px;
        }
        .premium-mini-badge {
          font-size: 9px;
          font-weight: 800;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.15);
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .text-primary { color: #38bdf8; }
        .text-amber { color: #f59e0b; }
      `}</style>
    </div>
  );
}
