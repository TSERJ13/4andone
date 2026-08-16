import { Metadata } from 'next';
import { supabase } from '@/utils/supabase';
import EmbedClientPlayer from './EmbedClientPlayer';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const { data: track } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', id)
      .single();

    if (track) {
      const trackTitle = `${track.title} - 4and.one Music`;
      const artwork = track.artwork_url || 'https://4and.one/icon.png';
      const embedUrl = `https://4and.one/embed/${id}`;

      return {
        title: trackTitle,
        description: `Listen to ${track.title} on 4and.one Dancesport Player`,
        openGraph: {
          title: trackTitle,
          description: `Listen to ${track.title} (${track.style || 'Dancesport'}) on 4and.one`,
          url: embedUrl,
          type: 'music.song',
          siteName: '4and.one Music',
          images: [{ url: artwork, width: 512, height: 512 }],
          audio: track.audio_url ? [{ url: track.audio_url, type: 'audio/mpeg' }] : undefined,
        },
        twitter: {
          card: 'player',
          title: trackTitle,
          description: `Listen to ${track.title} on 4and.one`,
          images: [artwork],
          players: [
            {
              playerUrl: embedUrl,
              streamUrl: track.audio_url || embedUrl,
              width: 500,
              height: 200,
            },
          ],
        },
      };
    }
  } catch (e) {}

  return {
    title: '4and.one Music Player',
  };
}

export default async function EmbedPage({ params }: Props) {
  const { id } = await params;
  let track: any = null;

  try {
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', id)
      .single();

    if (data) {
      track = {
        id: data.id,
        title: data.title,
        artist: data.artist,
        style: data.style,
        bpm: data.bpm,
        audioUrl: data.audio_url,
        artworkUrl: data.artwork_url,
        duration: data.duration,
      };
    }
  } catch (e) {}

  return <EmbedClientPlayer track={track} trackId={id} />;
}
