"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, Share2, Heart, Gauge, SkipBack, SkipForward, ArrowLeft, Volume2, Disc, Music2 } from 'lucide-react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import SpeedSelector from '@/components/audio/SpeedSelector';
import { formatDuration } from '@/utils/format';
import Link from 'next/link';

export default function TrackClientView({ trackId, initialTrack }: { trackId: string; initialTrack?: any }) {
  const {
    loadTrack,
    togglePlay,
    isPlaying,
    title: currentTitle,
    currentTime,
    duration,
    seek,
    bpm,
    setBpm,
    volume,
    setVolume,
    isLoaded
  } = useAudio();

  const { tracks, toggleFavorite } = useStudio();
  const [targetTrack, setTargetTrack] = useState<any>(initialTrack || null);
  const [showSpeed, setShowSpeed] = useState(false);

  useEffect(() => {
    if (initialTrack) {
      setTargetTrack(initialTrack);
      loadTrack(initialTrack);
    } else if (tracks.length > 0 && trackId) {
      const found = tracks.find(
        t => String(t.id) === trackId || t.title.toLowerCase() === trackId.toLowerCase()
      );
      if (found) {
        setTargetTrack(found);
        loadTrack(found);
      }
    }
  }, [initialTrack, tracks, trackId, loadTrack]);

  const isCurrentPlaying = targetTrack && currentTitle === targetTrack.title;
  const currentArtwork = targetTrack?.artworkUrl || targetTrack?.artwork_url || '/icon.png';
  const currentTitleText = targetTrack?.title || '4and.one Music Track';
  const currentArtistText = targetTrack?.artist || 'Dancesport & Ballroom';
  const currentStyleText = targetTrack?.style || 'Dancesport';
  const currentBpmText = targetTrack?.bpm || bpm;

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/track/${trackId}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `4and.one - ${currentTitleText}`,
        text: `Listen to ${currentTitleText} on 4and.one Free Web Music Player!`,
        url: shareUrl,
      }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      alert('Track link copied to clipboard!');
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seek(time);
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#09090b',
        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(29,185,84,0.15) 0%, rgba(9,9,11,1) 75%)',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 16px',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      {/* Header Bar */}
      <header style={{ width: '100%', maxWidth: '520px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <Link 
          href="/" 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.7)',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
            background: 'rgba(255,255,255,0.06)',
            padding: '8px 14px',
            borderRadius: '100px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <ArrowLeft size={16} /> All Music
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/icon.png" alt="4and.one" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#1db954', letterSpacing: '1px', textTransform: 'uppercase' }}>
            4and.one
          </span>
        </div>

        <button 
          onClick={handleShare}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: '100px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <Share2 size={16} /> Share
        </button>
      </header>

      {/* Main Single Track Player Area */}
      <main style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', margin: 'auto 0' }}>
        
        {/* Animated Artwork Disc */}
        <div style={{ position: 'relative', width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div 
            style={{
              width: '230px',
              height: '230px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#121212',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(29,185,84,0.3)',
              border: '4px solid #1db954',
              animation: isCurrentPlaying && isPlaying ? 'spin 12s linear infinite' : 'none',
              transition: 'all 0.5s ease'
            }}
          >
            <img src={currentArtwork} alt={currentTitleText} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* Track Title & Meta */}
        <div style={{ textAlign: 'center', width: '100%', padding: '0 16px', boxSizing: 'border-box' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(29,185,84,0.15)', border: '1px solid rgba(29,185,84,0.4)', padding: '4px 12px', borderRadius: '100px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1db954', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {currentStyleText} {currentBpmText ? `• ${currentBpmText} BPM` : ''}
            </span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0', lineHeight: 1.2 }}>
            {currentTitleText}
          </h1>

          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 500 }}>
            {currentArtistText}
          </p>
        </div>

        {/* Progress Bar & Timers */}
        <div style={{ width: '100%', padding: '0 12px', boxSizing: 'border-box' }}>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={isCurrentPlaying ? currentTime : 0}
            onChange={handleSeekChange}
            style={{
              width: '100%',
              accentColor: '#1db954',
              cursor: 'pointer',
              height: '6px',
              borderRadius: '3px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
            <span>{formatDuration(isCurrentPlaying ? currentTime : 0)}</span>
            <span>{formatDuration(duration || targetTrack?.duration || 0)}</span>
          </div>
        </div>

        {/* Big Main Play Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', width: '100%' }}>
          <button 
            onClick={() => setShowSpeed(!showSpeed)}
            style={{
              background: showSpeed ? 'rgba(29,185,84,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${showSpeed ? '#1db954' : 'rgba(255,255,255,0.15)'}`,
              color: showSpeed ? '#1db954' : '#fff',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="BPM Speed Selector"
          >
            <Gauge size={22} />
          </button>

          <button
            onClick={() => {
              if (isCurrentPlaying) {
                togglePlay();
              } else if (targetTrack) {
                loadTrack(targetTrack);
              }
            }}
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: '#1db954',
              color: '#000',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 12px 36px rgba(29,185,84,0.5)',
              transition: 'transform 0.2s',
              transform: 'scale(1.05)'
            }}
            aria-label="Play or Pause"
          >
            {isCurrentPlaying && isPlaying ? (
              <Pause size={36} fill="currentColor" />
            ) : (
              <Play size={36} fill="currentColor" style={{ marginLeft: '4px' }} />
            )}
          </button>

          <button 
            onClick={() => {
              if (targetTrack?.id) toggleFavorite(targetTrack.id);
            }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: targetTrack?.isFavorite ? '#ef4444' : '#fff',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Favorite"
          >
            <Heart size={22} fill={targetTrack?.isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Speed Selector Drawer/Modal if opened */}
        {showSpeed && (
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <SpeedSelector
              currentBpm={bpm}
              onSelect={(val) => setBpm(val)}
              onClose={() => setShowSpeed(false)}
            />
          </div>
        )}
      </main>

      {/* Footer Explore App Banner */}
      <footer style={{ width: '100%', maxWidth: '480px', textAlign: 'center', zIndex: 10, marginTop: '24px' }}>
        <Link 
          href="/" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#1db954',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 700,
            background: 'rgba(29,185,84,0.1)',
            padding: '12px 24px',
            borderRadius: '100px',
            border: '1px solid rgba(29,185,84,0.3)'
          }}
        >
          <Music2 size={18} /> Open Full 4and.one Library
        </Link>
      </footer>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
