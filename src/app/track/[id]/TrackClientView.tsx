"use client";

import React, { useEffect, useState } from 'react';
import { Play, Pause, Music2, Share2, Disc, Heart, ArrowLeft } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import Link from 'next/link';
import Home from '@/app/page';

export default function TrackClientView({ trackId }: { trackId: string }) {
  const { loadTrack, togglePlay, isPlaying, title: currentTitle } = useAudio();
  const { tracks, toggleFavorite } = useStudio();
  const [targetTrack, setTargetTrack] = useState<any>(null);

  useEffect(() => {
    if (tracks.length > 0 && trackId) {
      const found = tracks.find(
        t => String(t.id) === trackId || t.title.toLowerCase() === trackId.toLowerCase()
      );
      if (found) {
        setTargetTrack(found);
        loadTrack(found);
      }
    }
  }, [tracks, trackId, loadTrack]);

  const isCurrentPlaying = targetTrack && currentTitle === targetTrack.title;

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/track/${trackId}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `4and.one - ${targetTrack?.title || 'Music'}`,
        text: `Listen to ${targetTrack?.title || 'this track'} on 4and.one Free Web Music Player!`,
        url: shareUrl,
      }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      alert('Track link copied to clipboard!');
    }
  };

  return (
    <div>
      {/* Top Banner Dedicated Player for Shared Track */}
      {targetTrack && (
        <div 
          className="shared-track-banner glass animate-in"
          style={{
            margin: '16px auto',
            maxWidth: '1200px',
            width: '95%',
            padding: '16px 20px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(29,185,84,0.15) 0%, rgba(18,18,18,0.95) 100%)',
            border: '1.5px solid rgba(29,185,84,0.4)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '0', flex: '1' }}>
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {targetTrack.artworkUrl ? (
                <img src={targetTrack.artworkUrl} alt={targetTrack.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <img src="/icon.png" alt="4and.one logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>

            <div style={{ minWidth: '0' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1db954', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
                Shared Track • {targetTrack.style} {targetTrack.bpm ? `• ${targetTrack.bpm} BPM` : ''}
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {targetTrack.title}
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                {targetTrack.artist || '4and.one Music'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                if (isCurrentPlaying) {
                  togglePlay();
                } else {
                  loadTrack(targetTrack);
                }
              }}
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#1db954',
                color: '#000',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(29,185,84,0.5)',
                transition: 'transform 0.2s'
              }}
              aria-label="Play Shared Track"
            >
              {isCurrentPlaying && isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" style={{ marginLeft: '3px' }} />}
            </button>

            <button
              onClick={handleShare}
              className="glass"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Share Track"
              title="Share Track Link"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      )}

      <Home />
    </div>
  );
}
