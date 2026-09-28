import { permanentRedirect, notFound } from 'next/navigation';
import { getTrackBySlugOrId } from '@/lib/seo-data';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LegacyTrackPage({ params }: Props) {
  const { id } = await params;
  const { slug } = await getTrackBySlugOrId(id);

  if (slug) {
    permanentRedirect(`/music/${slug}`);
  }

  notFound();
}
