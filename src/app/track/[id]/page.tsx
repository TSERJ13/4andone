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
      const trackTitle = track.title;
      const artistLine = track.artist ? `Artist: ${track.artist}` : 'Artist: 4and.one Music';
      const trackDesc = `${artistLine}\nFree web music player for Dancesport and Ballroom dancers.`;
      const thumbUrl = track.artwork_url || 'https://4and.one/og-thumb.png';

      return {
        title: `${trackTitle} - ${artistLine} | 4and.one`,
        description: trackDesc,
        openGraph: {
          title: trackTitle,
          description: trackDesc,
          url: `https://4and.one/track/${id}`,
          siteName: '4and.one Music',
          type: 'music.song',
          images: [
            {
              url: thumbUrl,
              width: 160,
              height: 160,
              alt: `${track.title} logo`,
            },
          ],
          audio: track.audio_url ? [
            {
              url: track.audio_url,
              type: 'audio/mpeg',
            }
          ] : undefined,
        },
        twitter: {
          card: 'summary',
          title: trackTitle,
          description: trackDesc,
          images: [thumbUrl],
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
  let initialTrack: any = null;

  try {
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', id)
      .single();

    if (data) {
      initialTrack = {
        id: data.id,
        title: data.title,
        artist: data.artist,
        style: data.style,
        bpm: data.bpm,
        audioUrl: data.audio_url,
        artworkUrl: data.artwork_url,
        duration: data.duration
      };
    }
  } catch (e) {}

  const jsonLd = initialTrack ? {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    'name': initialTrack.title,
    'byArtist': {
      '@type': 'MusicGroup',
      'name': initialTrack.artist || '4and.one Music'
    },
    'genre': `${initialTrack.style || 'Dancesport'} / Ballroom Dance Music`,
    'url': `https://4and.one/track/${id}`,
    'audio': initialTrack.audioUrl ? {
      '@type': 'AudioObject',
      'contentUrl': initialTrack.audioUrl
    } : undefined
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <TrackClientView trackId={id} initialTrack={initialTrack} />
    </>
  );
}
