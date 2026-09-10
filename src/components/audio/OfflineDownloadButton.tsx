"use client";

import React, { useState, useEffect } from 'react';
import { Download, Check, ArrowDownToLine } from 'lucide-react';
import { Track } from '@/components/admin/StudioProvider';
import { isTrackDownloaded, downloadTrackOffline, subscribeToOfflineUpdates } from '@/utils/offline';

interface OfflineDownloadButtonProps {
  track: Track | null | undefined;
  className?: string;
  iconSize?: number;
  style?: React.CSSProperties;
}

export const OfflineDownloadButton: React.FC<OfflineDownloadButtonProps> = ({
  track,
  className = '',
  iconSize = 20,
  style = {}
}) => {
  const [downloaded, setDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!track?.id) {
      setDownloaded(false);
      return;
    }

    setDownloaded(isTrackDownloaded(track.id));

    const unsubscribe = subscribeToOfflineUpdates(() => {
      if (track?.id) {
        setDownloaded(isTrackDownloaded(track.id));
      }
    });

    return unsubscribe;
  }, [track?.id]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!track?.id || downloaded || isDownloading) return;

    setIsDownloading(true);
    try {
      await downloadTrackOffline(track);
      setDownloaded(true);
    } catch (err: any) {
      console.error('[OFFLINE-BUTTON-ERROR]', err);
      alert('Could not download track for offline listening: ' + (err?.message || 'Network error'));
    } finally {
      setIsDownloading(false);
    }
  };

  if (!track) return null;

  return (
    <button
      type="button"
      className={`offline-dl-btn ${downloaded ? 'is-downloaded' : ''} ${className}`}
      onClick={handleDownload}
      disabled={downloaded || isDownloading}
      title={
        downloaded
          ? 'Downloaded for offline listening (ინტერნეტის გარეშე)'
          : isDownloading
          ? 'Downloading...'
          : 'Download for offline playback (შიდა მეხსიერებაში შენახვა)'
      }
      aria-label={downloaded ? 'Track downloaded' : 'Download track for offline'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        cursor: downloaded ? 'default' : 'pointer',
        color: downloaded ? '#22c55e' : 'inherit',
        transition: 'all 0.2s',
        ...style
      }}
    >
      {isDownloading ? (
        <span
          style={{
            display: 'inline-block',
            width: iconSize,
            height: iconSize,
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderTopColor: '#22c55e',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
      ) : downloaded ? (
        <Check size={iconSize} color="#22c55e" strokeWidth={3} />
      ) : (
        <Download size={iconSize} />
      )}
    </button>
  );
};

export default OfflineDownloadButton;
