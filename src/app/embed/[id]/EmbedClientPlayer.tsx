"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, ExternalLink, Music2 } from 'lucide-react';

export default function EmbedClientPlayer({ track, trackId }: { track: any; trackId: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 1.0;
    }
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => console.log('Autoplay blocked', e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentTitle = track?.title || '4and.one Track';
  const currentArtist = track?.artist || 'Dancesport Music';
  const currentArtwork = track?.artworkUrl || '/icon.png';
  const audioSrc = track?.audioUrl;

  return (
    <div 
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a0a',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'linear-gradient(135deg, rgba(29,185,84,0.12) 0%, rgba(20,20,20,0.95) 100%)',
          border: '1px solid rgba(29,185,84,0.3)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {/* Audio Element */}
        {audioSrc && (
          <audio
            ref={audioRef}
            src={audioSrc}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
        )}

        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/icon.png" alt="4and.one" style={{ width: '22px', height: '22px', borderRadius: '4px' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#1db954', letterSpacing: '1px', textTransform: 'uppercase' }}>
              4and.one Player
            </span>
          </div>

          <a 
            href={`https://4and.one/track/${trackId}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
          >
            Open in App <ExternalLink size={12} />
          </a>
        </div>

        {/* Center Track Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div 
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#000',
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <img src={currentArtwork} alt={currentTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentTitle}
            </h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentArtist} {track?.style ? `• ${track.style}` : ''} {track?.bpm ? `• ${track.bpm} BPM` : ''}
            </p>
          </div>

          <button
            onClick={togglePlay}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#1db954',
              color: '#000',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(29,185,84,0.4)',
              flexShrink: 0
            }}
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>
        </div>

        {/* Progress Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', width: '30px' }}>
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            style={{
              flex: 1,
              accentColor: '#1db954',
              cursor: 'pointer'
            }}
          />

          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', width: '30px', textAlign: 'right' }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
