import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategoryData } from '@/lib/seo-data';
import { getDanceCategory } from '@/utils/seo';
import CategoryClientView from './CategoryClientView';

export async function generateCategoryMetadata(slug: string): Promise<Metadata> {
  const category = getDanceCategory(slug);

  if (!category) {
    return {
      title: 'Category Not Found | 4and.one',
      description: 'Dance category not found on 4and.one Music.',
      robots: { index: false, follow: false },
    };
  }

  const title = `${category.name} Music | 4and.one`;
  const description = category.description;
  const canonicalUrl = `https://4and.one/${category.slug}`;

  return {
    title,
    description,
    keywords: [
      `${category.name} music`,
      `${category.name} dance music`,
      `${category.name} ballroom`,
      `${category.name} dancesport`,
      `${category.name} practice tracks`,
      `${category.name} tempo BPM`,
      `${category.discipline} ballroom music`,
      'dancesport player',
      '4andone',
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: '4and.one Music',
      type: 'website',
      images: [
        {
          url: 'https://4and.one/icon.png',
          width: 512,
          height: 512,
          alt: `${category.name} Music on 4and.one`,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: ['https://4and.one/icon.png'],
    },
  };
}

export async function CategoryPage({ slug }: { slug: string }) {
  const { category, tracks } = await getCategoryData(slug);

  if (!category) {
    notFound();
  }

  const canonicalUrl = `https://4and.one/${category.slug}`;

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
        name: `${category.discipline} Ballroom`,
        item: 'https://4and.one',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${category.name} Music`,
        item: canonicalUrl,
      },
    ],
  };

  // Structured Data: CollectionPage
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Music`,
    description: category.description,
    url: canonicalUrl,
    numberOfItems: tracks.length,
    genre: `${category.name} / ${category.discipline} Ballroom`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      {/* Crawlable SSR HTML for Search Bots */}
      <div className="sr-only">
        <h1>{category.name} Music</h1>
        <p>{category.description}</p>
        <p>{tracks.length} practice tracks available with BPM tempo control.</p>
        <ul>
          {tracks.map(({ track, slug: tSlug }) => (
            <li key={track.id}>
              <a href={`https://4and.one/music/${tSlug}`}>{track.title}</a> - {track.artist} ({track.bpm || ''} BPM)
            </li>
          ))}
        </ul>
      </div>

      {/* Interactive UI with audio player integration */}
      <CategoryClientView
        category={category}
        initialTracks={tracks}
      />
    </>
  );
}
