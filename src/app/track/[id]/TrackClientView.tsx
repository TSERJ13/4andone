"use client";

import React, { useEffect } from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useStudio } from '@/components/admin/StudioProvider';
import Home from '@/app/page';

export default function TrackClientView({ trackId, initialTrack }: { trackId: string; initialTrack?: any }) {
  const { loadTrack } = useAudio();
  const { tracks } = useStudio();

  useEffect(() => {
    const triggerPlayer = (track: any) => {
      loadTrack(track);
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('open-full-player'));
        }
      }, 150);
    };

    if (initialTrack) {
      triggerPlayer(initialTrack);
    } else if (tracks.length > 0 && trackId) {
      const found = tracks.find(
        t => String(t.id) === trackId || t.title.toLowerCase() === trackId.toLowerCase()
      );
      if (found) {
        triggerPlayer(found);
      }
    }
  }, [initialTrack, tracks, trackId, loadTrack]);

  return <Home />;
}
