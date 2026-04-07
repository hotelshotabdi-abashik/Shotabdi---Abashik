export const getOptimizedUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  // Convert R2 public bucket URLs to the Cloudflare Worker domain for Auto-WebP and Edge Caching
  if (url.includes('pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev')) {
    return url.replace('pub-c0b44c83d9824fb19234fdfbbd92001e.r2.dev', 'shotabdi-abashik.bd');
  }
  return url;
};
