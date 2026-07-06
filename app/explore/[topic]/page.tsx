import { notFound } from 'next/navigation';
import { getNewsByTagSlug } from '@/lib/news';
import { getExploreTagCard } from '@/lib/explore-tags';
import { TopicExploreClient } from './TopicExploreClient';

export const dynamic = 'force-dynamic';

interface TopicPageProps {
  params: Promise<{ topic: string }>;
}

export default async function TopicExplorePage({ params }: TopicPageProps) {
  const { topic: topicSlug } = await params;
  const meta = getExploreTagCard(topicSlug);

  if (!meta) {
    notFound();
  }

  const articles = await getNewsByTagSlug(topicSlug);

  return <TopicExploreClient meta={meta} articles={articles} />;
}
