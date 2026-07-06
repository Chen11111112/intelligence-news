const DEFAULT_ARTICLE_IMAGE =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=90';

const ALLOWED_HOSTS = [
  'images.unsplash.com',
  'images.theconversation.com',
  'lh3.googleusercontent.com',
];

export function isAllowedNewsImageUrl(src: string): boolean {
  if (!src?.trim()) return false;
  try {
    const { hostname, protocol } = new URL(src);
    if (protocol !== 'https:') return false;
    return (
      ALLOWED_HOSTS.includes(hostname) ||
      hostname.endsWith('.theconversation.com')
    );
  } catch {
    return false;
  }
}

export function safeArticleImageUrl(src: string | undefined): string {
  if (src && isAllowedNewsImageUrl(src)) return src;
  return DEFAULT_ARTICLE_IMAGE;
}
