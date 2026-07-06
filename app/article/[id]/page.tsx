import { notFound } from 'next/navigation';
import { getNewsById } from '@/lib/news';
import ArticleDetailClient from './ArticleDetailClient';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = await getNewsById(id);

  if (!article) {
    notFound();
  }

  return <ArticleDetailClient article={article} />;
}
