import { getServerUrl } from './apiClient';

/**
 * Returns the optimal image source for a manga cover:
 * - Empty string if missing or dead domain (otakuteca)
 * - Direct CDN URL for MangaDex and Ikigai (which support no-referrer direct loading)
 * - Proxy URL (/api/cover-proxy) for scanlation CDNs that block hotlinking
 * - Dynamically prepends Render host URL if running inside Capacitor Android APK
 */
export const getCoverSrc = (url?: string): string => {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return '';
  
  // Dead domain fallback
  if (url.includes('otakuteca.com')) return '';

  // Direct CDN support for MangaDex and Ikigai
  if (url.includes('mangadex.org') || url.includes('ikigaimangas.cloud')) {
    return url;
  }

  // Scanlation CDNs (img2mw, tojimangas, carteldemanhwas, novelcool, etc.)
  const server = getServerUrl();
  const proxyPath = `/api/cover-proxy?url=${encodeURIComponent(url)}`;
  return server ? `${server}${proxyPath}` : proxyPath;
};
