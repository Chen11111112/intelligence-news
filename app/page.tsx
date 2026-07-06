import { ExploreHome } from '@/components/ExploreHome';
import { getAllNews } from '@/lib/news';

export const dynamic = 'force-dynamic';

export default async function ExplorePage() {
  const allArticles = await getAllNews();

  return <ExploreHome allArticles={allArticles} />;
}
