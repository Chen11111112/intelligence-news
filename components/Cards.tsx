'use client';

import React from 'react';
import Image from 'next/image'; // 1. 引入 Next.js 的 Image 元件
import { motion } from 'framer-motion'; // 修正為標準引入路徑
import { Clock } from 'lucide-react';

// 定義 ArticleCard 的 Props 型別
interface ArticleCardProps {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  description: string;
  image: string;
  readTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  progress?: number;
  onClick: () => void;
}

// 2. 改為不使用 React.FC 的標準函式寫法
export function ArticleCard({
  category,
  title,
  subtitle,
  description,
  image,
  readTime,
  difficulty,
  progress = 0,
  onClick
}: ArticleCardProps) {
  
  const difficultyColor = {
    Easy: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    Hard: 'bg-slate-900 text-white dark:bg-slate-800'
  };

  return (
    <motion.article 
      whileHover={{ y: -4 }}
      onClick={onClick}
      // 用標準 Tailwind 樣式取代 bento-card
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 cursor-pointer flex flex-col hover:border-blue-200 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-900"
    >
      {/* 圖片外殼必須是 relative，供 Next.js Image 做 fill 填滿 */}
      <div className="relative h-48 -mx-6 -mt-6 mb-6 overflow-hidden rounded-t-2xl">
        <Image 
          src={image} 
          alt={title}
          fill
          quality={90}
          sizes="(max-w-768px) 100vw, 400px"
          className="object-cover" 
        />
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${difficultyColor[difficulty]}`}>
          {difficulty}
        </div>
      </div>
      
      <div className="flex-grow flex flex-col">
        <span className="text-xs font-semibold text-blue-600 mb-2 dark:text-blue-400">{category}</span>
        <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-2 dark:text-gray-100">{title}</h3>
        {subtitle && <h4 className="text-sm font-medium text-slate-500 mb-3 line-clamp-1 dark:text-gray-400">{subtitle}</h4>}
        <p className="text-sm text-slate-600 mb-4 line-clamp-3 leading-relaxed dark:text-gray-300">{description}</p>
        
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{readTime}</span>
          </div>
          
          <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden dark:bg-gray-700">
            <div 
              className="bg-blue-600 h-full transition-all duration-700" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// 定義 TopicCard 的 Props 型別
interface TopicCardProps {
  label: string;
  chineseLabel: string;
  image: string;
  onClick: () => void;
}

// 3. 主題卡片元件
export function TopicCard({ label, chineseLabel, image, onClick }: TopicCardProps) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative group h-40 md:h-48 overflow-hidden rounded-[2rem] bg-slate-900 text-white cursor-pointer shadow-lg"
    >
      {/* 替換為 Next.js Image 優化背景圖 */}
      <Image 
        src={image} 
        alt={label}
        fill
        quality={90}
        sizes="(max-w-768px) 50vw, 300px"
        className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000" 
      />
      <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-slate-950/80 to-transparent">
        <span className="text-xs font-semibold text-blue-400 mb-1">{label}</span>
        <span className="text-lg font-bold text-white">{chineseLabel}</span>
      </div>
    </motion.div>
  );
}