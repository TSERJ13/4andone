import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTrackBySlugOrId } from '@/lib/seo-data';
import TrackClientView from './TrackClientView';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { track, category, slug: canonicalSlug } = await getTrackBySlugOrId(slug);

  if (!track) {
    return {
      title: 'Track Not Found | 4and.one',
      description: 'The requested DanceSport track could not be found on 4and.one Music.',
      robots: { index: false, follow: false },
    };
  }

  const danceName = category?.name || track.style;
  const bpmSuffix = track.bpm ? ` (${track.bpm} BPM)` : '';
  const artistLine = track.artist && track.artist !== '4and.one Music' ? ` – ${track.artist}` : '';
  const title = `${track.title}${artistLine} – ${danceName}${bpmSuffix} | 4and.one`;
  const description = `Listen to ${track.title} by ${track.artist || '4and.one Music'} (${danceName}${track.bpm ? `, ${track.bpm} BPM` : ''}) on 4and.one, DanceSport and ballroom music with adjustable speed.`;
  const canonicalUrl = `https://4and.one/music/${canonicalSlug}`;
  const ogImage = track.artworkUrl || 'https://4and.one/icon.png';

  return {
    title,
    description,
    keywords: [
      track.title,
      track.artist,
      danceName,
      `${danceName} music`,
      `${danceName} practice music`,
      'dancesport music',
      'ballroom dance music',
      'tempo control player',
      '4andone',
    ].filter(Boolean),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: '4and.one Music',
      type: 'music.song',
      images: [
        {
          url: ogImage,
          width: 500,
          height: 500,
          alt: `${track.title} ${danceName}`,
        },
      ],
      audio: track.audioUrl ? [
        {
          url: track.audioUrl,
          type: 'audio/mpeg',
        },
      ] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function TrackPage({ params }: Props) {
  const { slug } = await params;
  const { track, slug: canonicalSlug, category, relatedTracks } = await getTrackBySlugOrId(slug);

  if (!track) {
    notFound();
  }

  const danceName = category?.name || track.style;
  const discipline = category?.discipline || (['Cha-Cha-Cha', 'Samba', 'Rumba', 'Paso Doble', 'Jive'].includes(track.style) ? 'Latin' : 'Standard');
  const categoryPath = category?.slug ? `https://4and.one/${category.slug}` : `https://4and.one/style/${track.style.toLowerCase().replace(/[\s\-_]+/g, '-')}`;
  const trackUrl = `https://4and.one/music/${canonicalSlug}`;

  // Structured Data: BreadcrumbList
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://4and.one',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${discipline} Ballroom`,
        item: 'https://4and.one',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${danceName} Music`,
        item: categoryPath,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: track.title,
        item: trackUrl,
      },
    ],
  };

  // Structured Data: MusicRecording
  const musicRecordingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: track.title,
    byArtist: {
      '@type': 'MusicGroup',
      name: track.artist || '4and.one Music',
    },
    genre: `${danceName} / DanceSport Ballroom Music`,
    duration: track.duration ? `PT${Math.floor(track.duration / 60)}M${track.duration % 60}S` : undefined,
    url: trackUrl,
    inAlbum: track.album ? {
      '@type': 'MusicAlbum',
      name: track.album,
    } : undefined,
    audio: track.audioUrl ? {
      '@type': 'AudioObject',
      contentUrl: track.audioUrl,
      encodingFormat: 'audio/mpeg',
    } : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(musicRecordingJsonLd) }}
      />
      
      {/* Real crawlable HTML for search engine bots */}
      <div className="sr-only">
        <h1>{track.title}</h1>
        <p>{danceName} – {track.bpm ? `${track.bpm} BPM` : ''} DanceSport Practice Music</p>
        <p>Artist: {track.artist || '4and.one Music'}</p>
        <a href={categoryPath}>{danceName} Music</a>
      </div>

      <TrackClientView
        track={track}
        slug={canonicalSlug}
        category={category}
        relatedTracks={relatedTracks}
      />
    </>
  );
}
