import type { Topic } from '@/lib/types/data';
import { getConversationTag } from '@/lib/tags/conversation';
import { getSelectableTag } from '@/lib/tags/selectable';

export interface ExploreTagCard {
  slug: string;
  labelEn: string;
  topic?: Topic;
  isCore: boolean;
  img: string;
}

const DEFAULT_IMG =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=90';

export function getExploreTagCard(slug: string): ExploreTagCard | undefined {
  const tag = getSelectableTag(slug);
  const feed = getConversationTag(slug);
  if (!tag) return undefined;
  return {
    slug,
    labelEn: tag.en,
    topic: feed?.topic,
    isCore: true,
    img: (feed?.image ?? DEFAULT_IMG).replace(/w=1920/, 'w=800'),
  };
}

export function buildExploreTagCards(slugs: string[]): ExploreTagCard[] {
  return slugs.map((s) => getExploreTagCard(s)).filter((c): c is ExploreTagCard => !!c);
}
