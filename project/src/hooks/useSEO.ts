import { useEffect, useCallback } from 'react';

const SITE_ORIGIN = 'https://agrogina.com';

export interface SEOOptions {
  title: string;
  description: string;
  path?: string;
  keywords?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  structuredData?: Record<string, unknown>;
}

/**
 * Centralized SEO hook — sets document title, meta tags, OG/Twitter,
 * canonical URL, and optional JSON-LD structured data.
 *
 * Usage:
 *   useSEO({ title: 'Login', description: 'Connectez-vous à AgroGina', path: '/login' })
 */
export function useSEO(opts: SEOOptions) {
  const {
    title,
    description,
    path = '/',
    keywords,
    ogType = 'website',
    ogImage = '/og-image.png',
    canonicalUrl,
    noindex = false,
    structuredData,
  } = opts;

  const fullTitle = path === '/'
    ? `${title} | AgroGina`
    : `${title} | AgroGina`;

  const url = canonicalUrl || `${SITE_ORIGIN}${path}`;
  const imageUrl = ogImage.startsWith('http') ? ogImage : `${SITE_ORIGIN}${ogImage}`;

  const ensureMeta = useCallback(
    (nameOrProp: string, content: string, isProperty = false) => {
      if (!content) return;
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(
        `meta[${attr}="${nameOrProp}"]`,
      ) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, nameOrProp);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    },
    [],
  );

  const removeMeta = useCallback((nameOrProp: string, isProperty = false) => {
    const attr = isProperty ? 'property' : 'name';
    document.querySelector(`meta[${attr}="${nameOrProp}"]`)?.remove();
  }, []);

  useEffect(() => {
    document.title = fullTitle;

    ensureMeta('description', description);
    if (keywords) ensureMeta('keywords', keywords);
    ensureMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    ensureMeta('og:type', ogType, true);
    ensureMeta('og:url', url, true);
    ensureMeta('og:title', fullTitle, true);
    ensureMeta('og:description', description, true);
    ensureMeta('og:image', imageUrl, true);
    ensureMeta('og:image:width', '1200', true);
    ensureMeta('og:image:height', '630', true);
    ensureMeta('og:locale', 'fr_MA', true);
    ensureMeta('og:locale:alternate', 'ar_MA', true);
    ensureMeta('og:site_name', 'AgroGina', true);

    ensureMeta('twitter:card', 'summary_large_image');
    ensureMeta('twitter:url', url);
    ensureMeta('twitter:title', fullTitle);
    ensureMeta('twitter:description', description);
    ensureMeta('twitter:image', imageUrl);

    return () => {
      document.title = 'AgroGina - Plateforme de Gestion Agricole Intelligente | Maroc';
      removeMeta('og:type', true);
      removeMeta('og:url', true);
    };
  }, [fullTitle, description, keywords, ogType, url, imageUrl, noindex, ensureMeta, removeMeta]);

  useEffect(() => {
    if (!structuredData) return;

    const key = JSON.stringify(structuredData);
    const selector = 'script[data-route-seo]';
    const existing = document.querySelector(selector);

    if (existing) {
      existing.textContent = key;
    } else {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-route-seo', 'true');
      script.textContent = key;
      document.head.appendChild(script);
    }

    return () => {
      document.querySelector(selector)?.remove();
    };
  }, [structuredData]);
}

/** Returns the site origin for use in components */
export function useSiteOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : SITE_ORIGIN;
}
