export const getOptimizedUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  const WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://shotabdi-abashik.hotelshotabdiabashik.workers.dev';
  const OLD_DOMAIN = 'shotabdi-abashik.bd';
  
  if (url.includes(OLD_DOMAIN)) {
    return url.replace(new RegExp(`https?://${OLD_DOMAIN}`, 'g'), WORKER_URL);
  }
  
  return url;
};

export const getSEOImageAlt = (altText: string | undefined | null): string => {
  const base = altText || 'Hotel Shotabdi Residential';
  return `${base} | shotabdi abshik, hotel shotabdi, hote shotabdi abashik, best hotel website in sylhet, rose view hotel, grand palace sylhet, hotel noor jahan`;
};

export const getSEOImageTitle = (titleText: string | undefined | null): string => {
  const base = titleText || 'Hotel Shotabdi Residential';
  return `${base} - shotabdi abshik, hotel shotabdi, hote shotabdi abashik, best hotel website in sylhet, rose view hotel, grand palace sylhet, hotel noor jahan`;
};

