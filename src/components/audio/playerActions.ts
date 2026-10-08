import type { Track } from '@/components/admin/StudioProvider';
import { downloadTrackOffline } from '@/utils/offline';

// The player menus ("Save to playlist") open the one AddToPlaylistModal
// mounted in AppLayout through this event.
export const OPEN_ADD_TO_PLAYLIST_EVENT = 'open-add-to-playlist';

export const openAddToPlaylist = (track: Track | null | undefined) => {
  if (!track?.id) return;
  window.dispatchEvent(new CustomEvent<Track>(OPEN_ADD_TO_PLAYLIST_EVENT, { detail: track }));
};

// "Download track" = save it on this device for offline listening (the same
// store the Downloaded page and offline playback read), not a raw file link.
export const saveTrackOffline = async (track: { id: string; audioUrl?: string } | null | undefined) => {
  if (!track?.id) return;
  try {
    await downloadTrackOffline(track);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    alert('Could not download track for offline listening: ' + message);
  }
};
