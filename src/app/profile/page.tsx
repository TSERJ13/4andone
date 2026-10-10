"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Crown, Music2, Headphones, CalendarDays, Heart, ListMusic, Download, ChevronRight, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useStudio } from '@/components/admin/StudioProvider';
import { useAudioControls } from '@/components/audio/AudioProvider';
import { useDownloadedTracks } from '@/hooks/useDownloadedTracks';
import { TelegramLogin } from '@/components/auth/TelegramLogin';
import { TrackRow } from '@/components/tracks/TrackRow';
import { displayStyleName } from '@/utils/styleNames';
import { sessionFetch } from '@/utils/userSession';

interface ProfileData {
  account: { first_name?: string; last_name?: string; username?: string; photo_url?: string; created_at?: string } | null;
  premium: { active: boolean; subscriptionId: string | null; premiumUntil: string | null };
  stats: {
    totalPlays: number;
    uniqueTracks: number;
    last7Days: number;
    likedSongs: number;
    firstPlayAt: string | null;
    topStyles: { style: string; count: number }[];
    topTracks: { trackId: string; count: number }[];
  };
  referral?: { invitedBy: { name: string; at: string; premiumUntil: string | null } | null; invitedCount: number };
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function ProfilePage() {
  const { user, isAuthenticated, isPremium, logout, sessionVersion } = useAuth();
  const { tracks, folders } = useStudio();
  const { loadTrack, trackId: playingTrackId, isPlaying } = useAudioControls();
  const downloadedIds = useDownloadedTracks();
  const [data, setData] = useState<ProfileData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    sessionFetch(`/api/user/profile?tid=${user.id}`, { cache: 'no-store' })
      .then(r => {
        // 401 = the server session is still being set up; sessionVersion re-runs this
        if (r.status === 401) return null;
        return r.ok ? r.json() : Promise.reject(new Error(String(r.status)));
      })
      .then(d => { if (!cancelled && d) { setData(d); setFailed(false); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [user?.id, sessionVersion]);

  if (!isAuthenticated || !user) {
    return (
      <div className="profile-page">
        <div className="signin-card">
          <h1>Your profile</h1>
          <p>Sign in with Telegram to see your Premium, your listening stats and your history on every device.</p>
          <TelegramLogin />
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Dancer';
  const premium = data?.premium;
  const subId = premium?.subscriptionId || '';
  const plan = !isPremium && !premium?.active
    ? { label: 'Free plan', detail: 'Ads between tracks · Final Mode locked' }
    : subId.startsWith('LIFETIME_')
      ? { label: 'Premium · Lifetime', detail: 'Never expires' }
      : subId.startsWith('REFERRAL_')
        ? { label: 'Premium · Free from an invite', detail: premium?.premiumUntil ? `Free until ${fmtDate(premium.premiumUntil)}` : 'Active' }
      : subId.startsWith('MANUAL_')
        ? { label: 'Premium · Gift', detail: premium?.premiumUntil ? `Until ${fmtDate(premium.premiumUntil)}` : 'Forever' }
        : subId.startsWith('I-')
          ? { label: 'Premium · $1.99/month', detail: premium?.premiumUntil ? `Paid through ${fmtDate(premium.premiumUntil)} · renews automatically via PayPal` : 'Renews automatically via PayPal' }
          : { label: 'Premium', detail: premium?.premiumUntil ? `Until ${fmtDate(premium.premiumUntil)}` : 'Active' };
  const isPaidPlan = (isPremium || premium?.active) && subId.startsWith('I-');

  const stats = data?.stats;
  const maxStyle = stats?.topStyles[0]?.count || 1;
  const topTracks = (stats?.topTracks || [])
    .map(t => ({ track: tracks.find(x => x.id === t.trackId), count: t.count }))
    .filter((t): t is { track: NonNullable<typeof t.track>; count: number } => !!t.track);

  const tiles = [
    { icon: <Headphones size={18} />, value: stats?.totalPlays ?? '—', label: 'Plays' },
    { icon: <Music2 size={18} />, value: stats?.uniqueTracks ?? '—', label: 'Different songs' },
    { icon: <CalendarDays size={18} />, value: stats?.last7Days ?? '—', label: 'Plays this week' },
    { icon: <Heart size={18} />, value: stats?.likedSongs ?? '—', label: 'Liked songs' },
    { icon: <ListMusic size={18} />, value: folders.length, label: 'Playlists' },
    { icon: <Download size={18} />, value: downloadedIds.length, label: 'Downloaded' },
  ];

  return (
    <div className="profile-page">
      {/* Account */}
      <header className="profile-head">
        {user.photo_url ? (
          <img src={user.photo_url} alt="" className="avatar" />
        ) : (
          <div className="avatar avatar-letter">{name.charAt(0)}</div>
        )}
        <div className="head-info">
          <h1>{name}</h1>
          {user.username && <p className="handle">@{user.username}</p>}
          {data?.account?.created_at && <p className="since">Member since {fmtDate(data.account.created_at)}</p>}
        </div>
      </header>

      {/* Premium */}
      <section className={`plan-card ${isPremium || premium?.active ? 'is-premium' : ''}`}>
        <div className="plan-icon"><Crown size={22} /></div>
        <div className="plan-text">
          <span className="plan-label">{plan.label}</span>
          <span className="plan-detail">{plan.detail}</span>
        </div>
        {isPaidPlan ? (
          <a className="plan-btn" href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noopener noreferrer">
            Manage in PayPal <ExternalLink size={14} />
          </a>
        ) : !(isPremium || premium?.active) ? (
          <Link className="plan-btn primary" href="/upgrade">Get Premium</Link>
        ) : null}
      </section>

      {/* Invites */}
      <Link href="/earn" className="invite-card">
        <span className="invite-icon"><Gift size={18} /></span>
        <span className="invite-text">
          {data?.referral?.invitedBy ? (
            <>
              <span className="invite-label">You received free Premium</span>
              <span className="invite-detail">
                Invited by {data.referral.invitedBy.name} · {fmtDate(data.referral.invitedBy.at)}
                {data.referral.invitedBy.premiumUntil ? ` · 1 month free until ${fmtDate(data.referral.invitedBy.premiumUntil)}` : ''}
              </span>
            </>
          ) : (
            <>
              <span className="invite-label">Earn Premium</span>
              <span className="invite-detail">
                {data?.referral?.invitedCount
                  ? `You invited ${data.referral.invitedCount} ${data.referral.invitedCount === 1 ? 'friend' : 'friends'}`
                  : 'Invite a friend — you both get 1 month of Premium'}
              </span>
            </>
          )}
        </span>
        <ChevronRight size={18} className="invite-arrow" />
      </Link>

      {/* Stats */}
      <h2 className="section-title">Your listening</h2>
      {failed && <p className="muted">Stats could not be loaded right now.</p>}
      <div className="tiles">
        {tiles.map(t => (
          <div key={t.label} className="tile">
            <span className="tile-icon">{t.icon}</span>
            <span className="tile-value">{t.value}</span>
            <span className="tile-label">{t.label}</span>
          </div>
        ))}
      </div>

      {stats && stats.topStyles.length > 0 && (
        <>
          <h2 className="section-title">Top dances</h2>
          <div className="bars">
            {stats.topStyles.map(s => (
              <div key={s.style} className="bar-row">
                <span className="bar-name">{displayStyleName(s.style)}</span>
                <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max(6, (s.count / maxStyle) * 100)}%` }} /></span>
                <span className="bar-count">{s.count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {topTracks.length > 0 && (
        <>
          <h2 className="section-title">Most played</h2>
          <div className="track-list">
            {topTracks.map(({ track, count }) => (
              <TrackRow
                key={track.id}
                track={track}
                isActive={isPlaying && playingTrackId === track.id}
                onPlay={() => loadTrack(track)}
                badge="duration"
                extraAction={<span className="play-count">{count}×</span>}
              />
            ))}
          </div>
        </>
      )}

      <Link href="/history" className="history-link">
        <span>Listening history</span>
        <ChevronRight size={18} />
      </Link>

      <button type="button" className="signout" onClick={logout}>
        <LogOut size={16} /> Sign out
      </button>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .profile-page {
    max-width: 880px;
    margin: 0 auto;
    padding: 24px 0 140px;
    color: #fff;
  }
  .signin-card {
    max-width: 420px;
    margin: 40px auto;
    padding: 28px;
    border-radius: 16px;
    background: #1f1f1f;
    border: 1px solid rgba(255,255,255,0.08);
    text-align: center;
  }
  .signin-card h1 { margin: 0 0 8px; font-size: 22px; }
  .signin-card p { margin: 0 0 20px; color: #aaa; font-size: 14px; line-height: 1.5; }

  .profile-head { display: flex; align-items: center; gap: 18px; margin-bottom: 24px; }
  .avatar { width: 84px; height: 84px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .avatar-letter { display: flex; align-items: center; justify-content: center; background: #10b981; font-size: 34px; font-weight: 800; }
  .head-info h1 { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.15; }
  .handle { margin: 4px 0 0; color: #aaa; font-size: 14px; }
  .since { margin: 2px 0 0; color: #717171; font-size: 13px; }

  .plan-card {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 18px; border-radius: 16px;
    background: #1f1f1f; border: 1px solid rgba(255,255,255,0.08);
    margin-bottom: 28px;
  }
  .invite-card {
    display: flex; align-items: center; gap: 12px; margin: -14px 0 28px;
    padding: 12px 16px; border-radius: 14px; text-decoration: none; color: #fff;
    background: #1f1f1f; border: 1px solid rgba(255,255,255,0.08);
  }
  .invite-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(16,185,129,0.15); color: #34d399; flex-shrink: 0; }
  .invite-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .invite-label { font-weight: 800; font-size: 14px; }
  .invite-detail { color: #aaa; font-size: 13px; line-height: 1.4; }
  .invite-card :global(.invite-arrow) { color: #717171; flex-shrink: 0; }
  .plan-card.is-premium { border-color: rgba(16,185,129,0.45); background: linear-gradient(135deg, rgba(16,185,129,0.12), #1f1f1f 60%); }
  .plan-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.08); color: #aaa; flex-shrink: 0; }
  .is-premium .plan-icon { background: rgba(16,185,129,0.18); color: #10b981; }
  .plan-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .plan-label { font-weight: 800; font-size: 16px; }
  .plan-detail { color: #aaa; font-size: 13px; line-height: 1.4; }
  .plan-btn {
    display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
    height: 36px; padding: 0 16px; border-radius: 18px;
    background: rgba(255,255,255,0.1); color: #fff; font-size: 13px; font-weight: 700; text-decoration: none;
  }
  .plan-btn.primary { background: #fff; color: #0f0f0f; }

  .section-title { font-size: 18px; font-weight: 800; margin: 0 0 12px; }
  .muted { color: #aaa; font-size: 13px; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 28px; }
  .tile { display: flex; flex-direction: column; gap: 4px; padding: 14px; border-radius: 14px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.06); }
  .tile-icon { color: #10b981; display: flex; }
  .tile-value { font-size: 24px; font-weight: 800; line-height: 1.1; }
  .tile-label { color: #aaa; font-size: 12px; }

  .bars { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
  .bar-row { display: grid; grid-template-columns: 110px 1fr 40px; align-items: center; gap: 10px; font-size: 14px; }
  .bar-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar-track { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.08); overflow: hidden; }
  .bar-fill { display: block; height: 100%; border-radius: 4px; background: #10b981; }
  .bar-count { text-align: right; color: #aaa; font-variant-numeric: tabular-nums; }

  .track-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
  .play-count { color: #aaa; font-size: 12px; font-weight: 700; margin-right: 6px; }

  .history-link {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-radius: 14px; margin: 8px 0 16px;
    background: #1a1a1a; border: 1px solid rgba(255,255,255,0.06);
    color: #fff; font-weight: 700; text-decoration: none;
  }
  .signout {
    display: inline-flex; align-items: center; gap: 8px;
    height: 40px; padding: 0 18px; border-radius: 20px;
    background: transparent; border: 1px solid rgba(255,255,255,0.15);
    color: #fff; font-weight: 600; cursor: pointer;
  }

  @media (max-width: 768px) {
    .profile-page { padding-top: 12px; }
    .avatar { width: 68px; height: 68px; }
    .head-info h1 { font-size: 22px; }
    .tiles { grid-template-columns: repeat(2, 1fr); }
    .tile-value { font-size: 20px; }
    .plan-card { flex-wrap: wrap; }
    .plan-btn { width: 100%; justify-content: center; }
    .bar-row { grid-template-columns: 90px 1fr 36px; }
  }
`;
