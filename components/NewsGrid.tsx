'use client';

import { ArticleImage } from '@/components/ArticleImage';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { BookmarkButton } from '@/components/BookmarkButton';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { NewsArticle } from '@/lib/data';

interface NewsGridProps {
  articles: NewsArticle[];
  emptyMessage?: string;
}

export function NewsGrid({ articles, emptyMessage = '目前沒有新聞，請執行 npm run crawl 更新資料。' }: NewsGridProps) {
  if (articles.length === 0) {
    return (
      <p className="ui-empty text-center py-12">
        {emptyMessage}
      </p>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
    >
      {articles.map((article) => (
        <motion.div key={article.id} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
          <Link href={`/article/${article.id}`} className="block group">
            <article className="flex flex-col h-full ui-card overflow-hidden hover:shadow-md transition-all">
              <motion.div className="relative h-48 overflow-hidden" whileHover={{ scale: 1.02 }}>
                <ArticleImage
                  src={article.imageUrl}
                  alt={article.titleEn}
                  fill
                  quality={90}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 z-10">
                  <BookmarkButton articleId={article.id} className="bg-white/90 dark:bg-gray-800/90 shadow-sm" />
                </div>
                <motion.div
                  className={cn(
                    'absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase',
                    article.difficulty === 'Easy'
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                      : article.difficulty === 'Medium'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
                  )}
                >
                  {article.difficulty}
                </motion.div>
              </motion.div>
              <motion.div className="p-6 flex-grow flex flex-col" whileHover={{ y: -2 }}>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase">{article.topic}</span>
                <h3 className="text-lg font-bold mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 dark:text-gray-100">
                  {article.titleEn}
                </h3>
                <h4 className="text-base text-slate-500 dark:text-gray-400 font-semibold mb-4 line-clamp-2">{article.descriptionEn}</h4>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50 dark:border-gray-700">
                  <span className="text-[10px] text-slate-400 dark:text-gray-500 font-bold">{article.readTime}</span>
                  <ChevronRight className="text-slate-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" size={18} />
                </div>
              </motion.div>
            </article>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
