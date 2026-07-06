'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArticleImage } from '@/components/ArticleImage';
import { t, tagLabel } from '@/lib/copy';
import type { ExploreTagCard } from '@/lib/explore-tags';

interface ExploreTopicsProps {
  tags: ExploreTagCard[];
}

export function ExploreTopics({ tags }: ExploreTopicsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {tags.map((tag) => (
        <Link key={tag.slug} href={`/explore/${tag.slug}`}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative h-40 md:h-48 rounded-2xl overflow-hidden cursor-pointer group bg-slate-900"
          >
            <div className="absolute inset-0">
              <ArticleImage
                src={tag.img}
                alt={tag.labelEn}
                fill
                quality={90}
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover opacity-40 group-hover:scale-110 transition-transform duration-700"
              />
            </div>
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 p-4 flex flex-col justify-end text-white">
              <span className="text-[10px] uppercase tracking-widest opacity-80">{tag.labelEn}</span>
              <span className="text-xl font-bold">{tagLabel(tag.slug)}</span>
              <span className="text-[10px] mt-1 opacity-70">{t('explore.tapExplore')}</span>
            </div>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}
