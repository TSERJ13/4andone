import { Metadata } from 'next';
import { supabase } from '@/utils/supabase';
import TrackClientView from './TrackClientView';

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
      const trackTitle = `${track.title} - ${track.artist || '4and.one Music'}`;
      const trackDesc = `Listen to ${track.title} (${track.style || 'Dancesport'} • ${track.bpm ? `${track.bpm} BPM` : 'Music'}) on 4and.one Free Web Music Player.`;
      const artwork = track.artwork_url || 'https://4and.one/icon.png';
      const audioUrl = track.audio_url;

      return {
        title: trackTitle,
        description: trackDesc,
        openGraph: {
          title: trackTitle,
          description: trackDesc,
          url: `https://4and.one/track/${id}`,
          siteName: '4and.one Music',
          type: 'music.song',
          images: [
            {
              url: artwork,
              width: 512,
              height: 512,
              alt: `${track.title} logo artwork`,
            },
          ],
          audio: audioUrl ? [
            {
              url: audioUrl,
              type: 'audio/mpeg',
            }
          ] : undefined,
        },
        twitter: {
          card: 'summary_large_image',
          title: trackTitle,
          description: trackDesc,
          images: [artwork],
        },
      };
    }
  } catch (e) {
    // Fallback if track not found on server
  }

  return {
    title: '4and.one - Free Web Music Player',
    description: 'Listen to Dancesport & Ballroom music online with high-fidelity BPM tempo control.',
  };
}

export default async function TrackPage({ params }: Props) {
  const { id } = await params;
  return <TrackClientView trackId={id} />;
}
