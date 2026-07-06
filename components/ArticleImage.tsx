'use client';

import Image from 'next/image';
import { isAllowedNewsImageUrl, safeArticleImageUrl } from '@/lib/image-url';

interface ArticleImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  quality?: number;
  priority?: boolean;
}

export function ArticleImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
  quality = 90,
  priority,
}: ArticleImageProps) {
  const safeSrc = safeArticleImageUrl(src);

  if (!isAllowedNewsImageUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={safeSrc}
        alt={alt}
        className={fill ? `absolute inset-0 h-full w-full object-cover ${className ?? ''}` : className}
        width={width}
        height={height}
      />
    );
  }

  return (
    <Image
      src={safeSrc}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      quality={quality}
      priority={priority}
    />
  );
}
