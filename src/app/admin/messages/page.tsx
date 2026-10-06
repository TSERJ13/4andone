"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { adminDb } from '@/lib/admin-db';
import { 
  Mail, MessageSquare, Trash2, Reply, RefreshCw, 
  Search, Calendar, User, Clock, CheckCircle2, AlertTriangle, Filter
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

export default function AdminMessagesPage() {
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

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <Mail size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: 'white' }}>Messages & Inquiries</h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa' }}>
                User messages, advertising inquiries, and feedback sent from 4and.one
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={fetchMessages}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: 600,
          background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: feedback.type === 'success' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          color: feedback.type === 'success' ? '#4ade80' : '#f87171',
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '16px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Total Inquiries</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', marginTop: '4px' }}>{messages.length}</div>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '16px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Unique Senders</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
            {new Set(messages.map(m => m.email).filter(e => e !== 'No email provided')).size}
          </div>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '16px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Recipient Mail</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#818cf8', marginTop: '10px' }}>4andonestudio@gmail.com</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
          <input
            type="text"
            placeholder="Search by sender, email, text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Topic Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {topics.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTopic(t)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedTopic === t ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                background: selectedTopic === t ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedTopic === t ? '#818cf8' : '#a1a1aa',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#a1a1aa' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading messages...</div>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          color: '#a1a1aa',
        }}>
          <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h4 style={{ margin: '0 0 6px', color: 'white', fontSize: '16px' }}>No messages found</h4>
          <p style={{ margin: 0, fontSize: '13px' }}>
            {search || selectedTopic !== 'all' ? 'Try changing your search or filter.' : 'No contact inquiries have been received yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredMessages.map((msg) => {
            const topicBadge = getTopicColor(msg.topic);

            return (
              <div
                key={msg.id}
                style={{
                  background: 'rgba(20, 20, 24, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '20px',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                {/* Top Row: Sender Info & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '16px',
                    }}>
                      {msg.name ? msg.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'white', fontWeight: 800, fontSize: '15px' }}>{msg.name}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: topicBadge.bg,
                            color: topicBadge.text,
                            border: `1px solid ${topicBadge.border}`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {msg.topic}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#38bdf8', marginTop: '2px' }}>
                        {msg.email}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#71717a', marginRight: '6px' }}>
                      {timeAgo(msg.created_at)} • {formatDate(msg.created_at)}
                    </span>

                    {msg.email && msg.email !== 'No email provided' && (
                      <a
                        href={`mailto:${msg.email}?subject=Re: [4and.one ${msg.topic}] Inquiry response&body=Hi ${msg.name},%0D%0A%0D%0AThank you for reaching out to 4and.one.%0D%0A%0D%0A`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#818cf8',
                          fontSize: '12px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                        title="Reply via Email"
                      >
                        <Reply size={14} />
                        <span>Reply</span>
                      </a>
                    )}

                    <button
                      onClick={() => setDeleteModal({ isOpen: true, message: msg })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#f87171',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      title="Delete Message"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Message Body */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  color: '#e4e4e7',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.message}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          title="Delete Message"
          message={`Are you sure you want to delete the message from "${deleteModal.message?.name}" (${deleteModal.message?.email})? This action cannot be undone.`}
          confirmText={isDeleting ? 'Deleting...' : 'Delete Message'}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal({ isOpen: false, message: null })}
        />
      )}
    </div>
  );
}
