import 'server-only';

import { cache } from 'react';
import type { NewsArticle, Topic } from '@/lib/types/data';
import { getNewsFromDb } from '@/lib/news/store';
import { getNewsFromJson } from '@/lib/news/json';
import { staticArticles } from '@/lib/news/static';
import { safeArticleImageUrl } from '@/lib/news/image';
import { articleBelongsToTagSlug, normalizeTopic } from '@/lib/tags/normalize';

const getCachedDbNews = cache(async (): Promise<NewsArticle[] | null> => getNewsFromDb());
const getCachedJsonNews = cache(async (): Promise<NewsArticle[] | null> => getNewsFromJson());

function isConversationArticle(article: NewsArticle): boolean {
  return (article.sourceUrl ?? '').includes('theconversation.com');
}

function normalizeArticle(article: NewsArticle): NewsArticle {
  const topic = normalizeTopic(article.topic) ?? article.topic;
  return {
    ...article,
    topic: topic as Topic,
    imageUrl: safeArticleImageUrl(article.imageUrl),
  };
}

async function resolveArticles(): Promise<NewsArticle[]> {
  const fromJson = await getCachedJsonNews();
  if (fromJson && fromJson.length > 0) {
    const conversation = fromJson.filter(isConversationArticle).map(normalizeArticle);
    if (conversation.length > 0) return conversation;
  }

  const fromDb = await getCachedDbNews();
  if (fromDb && fromDb.length > 0) {
    const conversationOnly = fromDb.filter(isConversationArticle);
    if (conversationOnly.length > 0) {
      return conversationOnly.map(normalizeArticle);
    }
  }

  return staticArticles.map(normalizeArticle);
}

export async function getAllNews(): Promise<NewsArticle[]> {
  return resolveArticles();
}

export async function getNewsById(id: string): Promise<NewsArticle | undefined> {
  const articles = await resolveArticles();
  return articles.find((article) => article.id === id);
}

export async function getNewsByTopic(topic: Topic): Promise<NewsArticle[]> {
  return (await resolveArticles()).filter((article) => article.topic === topic);
}

export async function getLatestNews(limit = 12): Promise<NewsArticle[]> {
  return (await resolveArticles()).slice(0, limit);
}

export async function getNewsByTopics(topics: Topic[]): Promise<NewsArticle[]> {
  if (topics.length === 0) return [];
  const set = new Set(topics);
  return (await resolveArticles()).filter((article) => set.has(article.topic));
}

export async function getNewsByTagSlug(slug: string): Promise<NewsArticle[]> {
  return (await resolveArticles()).filter((article) => articleBelongsToTagSlug(article, slug));
}

export async function getNewsByIds(ids: string[]): Promise<NewsArticle[]> {
  if (ids.length === 0) return [];

  const unique = [...new Set(ids)];
  const articles = await Promise.all(unique.map((id) => getNewsById(id)));
  return articles.filter((article): article is NewsArticle => Boolean(article));
}
