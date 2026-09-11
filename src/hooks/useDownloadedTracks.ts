"use client";

import { useState, useEffect } from 'react';
import { getOfflineTrackIds, subscribeToOfflineUpdates } from '@/utils/offline';

export const useDownloadedTracks = (): string[] => {
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  useEffect(() => {
    setDownloadedIds(getOfflineTrackIds());
    return subscribeToOfflineUpdates(() => {
      setDownloadedIds(getOfflineTrackIds());
    });
  }, []);

  return downloadedIds;
};
